import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  buildBillingChargeWebhookPatch,
  chargeStatusForAsaasEvent,
  safePaymentExternalReference,
} from "@/lib/asaas/webhook-events";
import { validateAsaasWebhookToken } from "@/lib/asaas/webhook-verify";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminClient } from "@/lib/supabase/admin";
import type { ChargeStatus, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validateAsaasWebhookToken(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await request.json()) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const asaasEventId = payload.id;
  const eventType = payload.event;
  const asaasPaymentId = payload.payment?.id ?? null;

  if (!asaasEventId || !eventType) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const eventRow = await registerWebhookEvent(admin, {
    asaasEventId,
    eventType,
    asaasPaymentId,
    payload,
  });

  if (!eventRow.ok) {
    return NextResponse.json(
      { ok: false, error: "event_register_failed" },
      { status: 500 },
    );
  }
  if (eventRow.duplicateProcessed) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const localStatus = chargeStatusForAsaasEvent(eventType);
  if (!localStatus || !asaasPaymentId) {
    await markWebhookEventProcessed(admin, eventRow.id);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const chargeResult = await findChargeForWebhook(
    admin,
    asaasPaymentId,
    safePaymentExternalReference(payload),
  );

  if (!chargeResult.ok) {
    await markWebhookEventFailed(admin, eventRow.id, chargeResult.error);
    return NextResponse.json(
      { ok: false, error: "charge_lookup_failed" },
      { status: 500 },
    );
  }

  const charge = chargeResult.charge;
  if (!charge) {
    const { processSaasSubscriptionWebhook } = await import("@/lib/asaas/webhook-saas");
    const saasHandled = await processSaasSubscriptionWebhook(admin, payload);
    
    if (saasHandled) {
      await markWebhookEventProcessed(admin, eventRow.id);
      return NextResponse.json({ ok: true, saas_subscription: true });
    }

    await markWebhookEventProcessed(admin, eventRow.id);
    return NextResponse.json({ ok: true, unknown_payment: true });
  }

  const statusPatch = buildBillingChargeWebhookPatch({
    eventType,
    payload,
    current: {
      status: charge.status,
      paid_at: charge.paid_at,
    },
  });

  const patch: {
    status?: ChargeStatus;
    paid_at?: string;
    invoice_url?: string | null;
    asaas_payment_id?: string;
  } = statusPatch ? { ...statusPatch } : {};

  if (!charge.asaas_payment_id) {
    patch.asaas_payment_id = asaasPaymentId;
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateError } = await admin
      .from("billing_charges")
      .update(patch)
      .eq("id", charge.id);

    if (updateError) {
      await markWebhookEventFailed(admin, eventRow.id, updateError.message);
      return NextResponse.json(
        { ok: false, error: "charge_update_failed" },
        { status: 500 },
      );
    }
  }

  await markWebhookEventProcessed(admin, eventRow.id);
  revalidatePath(`/app/obras/${charge.project_id}`);
  revalidatePath("/app/financeiro");

  return NextResponse.json({ ok: true });
}

interface WebhookCharge {
  id: string;
  project_id: string;
  status: ChargeStatus;
  paid_at: string | null;
  asaas_payment_id: string | null;
}

async function findChargeForWebhook(
  admin: AdminClient,
  asaasPaymentId: string,
  externalReference: string | null,
): Promise<
  | { ok: true; charge: WebhookCharge | null }
  | { ok: false; error: string }
> {
  const select = "id, project_id, status, paid_at, asaas_payment_id";
  const { data: byPaymentId, error: paymentError } = await admin
    .from("billing_charges")
    .select(select)
    .eq("asaas_payment_id", asaasPaymentId)
    .maybeSingle();

  if (paymentError) return { ok: false, error: paymentError.message };
  if (byPaymentId) {
    return { ok: true, charge: byPaymentId as WebhookCharge };
  }

  if (!externalReference) return { ok: true, charge: null };

  const { data: byExternalRef, error: externalRefError } = await admin
    .from("billing_charges")
    .select(select)
    .eq("id", externalReference)
    .maybeSingle();

  if (externalRefError) {
    return { ok: false, error: externalRefError.message };
  }

  if (
    byExternalRef?.asaas_payment_id &&
    byExternalRef.asaas_payment_id !== asaasPaymentId
  ) {
    return { ok: true, charge: null };
  }

  return { ok: true, charge: (byExternalRef as WebhookCharge | null) ?? null };
}

async function registerWebhookEvent(
  admin: AdminClient,
  input: {
    asaasEventId: string;
    eventType: string;
    asaasPaymentId: string | null;
    payload: AsaasWebhookPayload;
  },
): Promise<
  | { ok: true; id: string; duplicateProcessed: boolean }
  | { ok: false }
> {
  const { data, error } = await admin
    .from("billing_webhook_events")
    .insert({
      asaas_event_id: input.asaasEventId,
      event_type: input.eventType,
      asaas_payment_id: input.asaasPaymentId,
      raw_payload: input.payload as unknown as Json,
      processing_error: null,
    })
    .select("id")
    .single();

  if (!error && data) {
    return { ok: true, id: data.id, duplicateProcessed: false };
  }

  if (error?.code !== "23505") {
    console.error("[asaas.webhook] register failed", error);
    return { ok: false };
  }

  const { data: existing, error: existingError } = await admin
    .from("billing_webhook_events")
    .select("id, processed_at")
    .eq("asaas_event_id", input.asaasEventId)
    .maybeSingle();

  if (existingError || !existing) {
    console.error("[asaas.webhook] duplicate lookup failed", existingError);
    return { ok: false };
  }

  return {
    ok: true,
    id: existing.id,
    duplicateProcessed: Boolean(existing.processed_at),
  };
}

async function markWebhookEventProcessed(admin: AdminClient, id: string) {
  await admin
    .from("billing_webhook_events")
    .update({ processed_at: new Date().toISOString(), processing_error: null })
    .eq("id", id);
}

async function markWebhookEventFailed(
  admin: AdminClient,
  id: string,
  message: string,
) {
  await admin
    .from("billing_webhook_events")
    .update({ processing_error: message.slice(0, 1000) })
    .eq("id", id);
}

