import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { validateAsaasWebhookToken } from "@/lib/asaas/webhook-verify";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChargeStatus, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

const EVENT_STATUS: Partial<Record<string, ChargeStatus>> = {
  PAYMENT_RECEIVED: "received",
  PAYMENT_CONFIRMED: "confirmed",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "cancelled",
};

const PAID_EVENTS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

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

  const localStatus = EVENT_STATUS[eventType] ?? null;
  if (!localStatus || !asaasPaymentId) {
    await markWebhookEventProcessed(admin, eventRow.id);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: charge, error: chargeError } = await admin
    .from("billing_charges")
    .select("id, project_id")
    .eq("asaas_payment_id", asaasPaymentId)
    .maybeSingle();

  if (chargeError) {
    await markWebhookEventFailed(admin, eventRow.id, chargeError.message);
    return NextResponse.json(
      { ok: false, error: "charge_lookup_failed" },
      { status: 500 },
    );
  }

  if (!charge) {
    await markWebhookEventProcessed(admin, eventRow.id);
    return NextResponse.json({ ok: true, unknown_payment: true });
  }

  const patch: {
    status: ChargeStatus;
    paid_at?: string;
    invoice_url?: string | null;
  } = { status: localStatus };

  if (PAID_EVENTS.has(eventType)) {
    patch.paid_at = paymentTimestamp(payload);
  }
  if (payload.payment?.invoiceUrl !== undefined) {
    patch.invoice_url = payload.payment.invoiceUrl;
  }

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

  await markWebhookEventProcessed(admin, eventRow.id);
  revalidatePath(`/app/obras/${charge.project_id}`);
  revalidatePath("/app/financeiro");

  return NextResponse.json({ ok: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

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

function paymentTimestamp(payload: AsaasWebhookPayload): string {
  const raw =
    payload.payment?.clientPaymentDate ?? payload.payment?.paymentDate ?? null;
  if (!raw) return new Date().toISOString();
  if (raw.includes("T")) return raw;
  return `${raw}T00:00:00-03:00`;
}
