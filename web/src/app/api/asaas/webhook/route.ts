import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { sendOperationalAlert } from "@/lib/alerts";
import {
  buildBillingChargeWebhookPatch,
  chargeStatusForAsaasEvent,
  safePaymentExternalReference,
} from "@/lib/asaas/webhook-events";
import { validateAsaasWebhookToken } from "@/lib/asaas/webhook-verify";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";
import { logServerError, logServerEvent, logServerWarning } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminClient } from "@/lib/supabase/admin";
import type { ChargeStatus, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = request.headers.get("x-vercel-id");

  if (!validateAsaasWebhookToken(request.headers.get("asaas-access-token"))) {
    logServerWarning("asaas.webhook.unauthorized", {
      request_id: requestId,
      ms: Date.now() - start,
    });
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await request.json()) as AsaasWebhookPayload;
  } catch (error) {
    logServerError("asaas.webhook.invalid_json", error, {
      request_id: requestId,
      ms: Date.now() - start,
    });
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const asaasEventId = payload.id;
  const eventType = payload.event;
  const asaasPaymentId = payload.payment?.id ?? null;

  if (!asaasEventId || !eventType) {
    logServerWarning("asaas.webhook.invalid_payload", {
      request_id: requestId,
      has_event_id: Boolean(asaasEventId),
      has_event_type: Boolean(eventType),
      ms: Date.now() - start,
    });
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
    logServerError("asaas.webhook.event_register_failed", null, {
      request_id: requestId,
      event_type: eventType,
      asaas_event_id: asaasEventId,
      asaas_payment_id: asaasPaymentId,
      ms: Date.now() - start,
    });
    await sendOperationalAlert({
      area: "asaas_webhook",
      severity: "critical",
      title: "Webhook Asaas nao registrou evento",
      message:
        "O webhook recebeu um evento do Asaas, mas nao conseguiu registrar o evento localmente. Pode haver falha de banco ou duplicidade mal resolvida.",
      dedupeKey: `asaas-register-${eventType}`,
      context: {
        event_type: eventType,
        asaas_event_id: asaasEventId,
        asaas_payment_id: asaasPaymentId,
        request_id: requestId,
        ms: Date.now() - start,
      },
    });
    return NextResponse.json(
      { ok: false, error: "event_register_failed" },
      { status: 500 },
    );
  }
  if (eventRow.duplicateProcessed) {
    logServerEvent("asaas.webhook.duplicate_processed", {
      request_id: requestId,
      event_type: eventType,
      asaas_event_id: asaasEventId,
      asaas_payment_id: asaasPaymentId,
      ms: Date.now() - start,
    });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const localStatus = chargeStatusForAsaasEvent(eventType);
  if (!localStatus || !asaasPaymentId) {
    await markWebhookEventProcessed(admin, eventRow.id);
    logServerEvent("asaas.webhook.ignored", {
      request_id: requestId,
      event_type: eventType,
      asaas_event_id: asaasEventId,
      asaas_payment_id: asaasPaymentId,
      ms: Date.now() - start,
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const chargeResult = await findChargeForWebhook(
    admin,
    asaasPaymentId,
    safePaymentExternalReference(payload),
  );

  if (!chargeResult.ok) {
    await markWebhookEventFailed(admin, eventRow.id, chargeResult.error);
    logServerError("asaas.webhook.charge_lookup_failed", {
      message: chargeResult.error,
    }, {
      request_id: requestId,
      event_type: eventType,
      asaas_event_id: asaasEventId,
      asaas_payment_id: asaasPaymentId,
      ms: Date.now() - start,
    });
    await sendOperationalAlert({
      area: "asaas_webhook",
      severity: "critical",
      title: "Webhook Asaas falhou ao buscar cobranca",
      message:
        "O webhook recebeu pagamento do Asaas, mas falhou ao localizar a cobranca local. A baixa automatica pode nao acontecer.",
      dedupeKey: `asaas-charge-lookup-${eventType}`,
      context: {
        event_type: eventType,
        asaas_event_id: asaasEventId,
        asaas_payment_id: asaasPaymentId,
        request_id: requestId,
        ms: Date.now() - start,
      },
    });
    return NextResponse.json(
      { ok: false, error: "charge_lookup_failed" },
      { status: 500 },
    );
  }

  const charge = chargeResult.charge;
  if (!charge) {
    const { processSaasSubscriptionWebhook } = await import("@/lib/asaas/webhook-saas");
    let saasHandled = false;
    try {
      saasHandled = await processSaasSubscriptionWebhook(admin, payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "saas_subscription_failed";
      await markWebhookEventFailed(admin, eventRow.id, message);
      logServerError("asaas.webhook.saas_subscription_failed", error, {
        request_id: requestId,
        event_type: eventType,
        asaas_event_id: asaasEventId,
        asaas_payment_id: asaasPaymentId,
        ms: Date.now() - start,
      });
      await sendOperationalAlert({
        area: "asaas_webhook",
        severity: "critical",
        title: "Webhook nao ativou assinatura SaaS",
        message:
          "Um pagamento de assinatura SaaS foi recebido, mas a ativacao/downgrade do plano falhou.",
        dedupeKey: `asaas-saas-subscription-${eventType}`,
        context: {
          event_type: eventType,
          asaas_event_id: asaasEventId,
          asaas_payment_id: asaasPaymentId,
          request_id: requestId,
          error_name: error instanceof Error ? error.name : "unknown",
          ms: Date.now() - start,
        },
      });
      return NextResponse.json(
        { ok: false, error: "saas_subscription_failed" },
        { status: 500 },
      );
    }
    
    if (saasHandled) {
      await markWebhookEventProcessed(admin, eventRow.id);
      logServerEvent("asaas.webhook.saas_subscription_processed", {
        request_id: requestId,
        event_type: eventType,
        asaas_event_id: asaasEventId,
        asaas_payment_id: asaasPaymentId,
        ms: Date.now() - start,
      });
      return NextResponse.json({ ok: true, saas_subscription: true });
    }

    await markWebhookEventProcessed(admin, eventRow.id);
    logServerWarning("asaas.webhook.unknown_payment", {
      request_id: requestId,
      event_type: eventType,
      asaas_event_id: asaasEventId,
      asaas_payment_id: asaasPaymentId,
      ms: Date.now() - start,
    });
    await sendOperationalAlert({
      area: "asaas_webhook",
      severity: "warning",
      title: "Webhook Asaas recebeu pagamento desconhecido",
      message:
        "O Asaas enviou um pagamento que nao foi associado a cobranca de obra nem assinatura SaaS.",
      dedupeKey: `asaas-unknown-payment-${eventType}`,
      context: {
        event_type: eventType,
        asaas_event_id: asaasEventId,
        asaas_payment_id: asaasPaymentId,
        request_id: requestId,
        ms: Date.now() - start,
      },
    });
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
      logServerError("asaas.webhook.charge_update_failed", updateError, {
        request_id: requestId,
        event_type: eventType,
        asaas_event_id: asaasEventId,
        asaas_payment_id: asaasPaymentId,
        charge_id: charge.id,
        project_id: charge.project_id,
        ms: Date.now() - start,
      });
      await sendOperationalAlert({
        area: "asaas_webhook",
        severity: "critical",
        title: "Webhook Asaas nao atualizou cobranca",
        message:
          "O webhook localizou a cobranca, mas falhou ao atualizar status/pagamento. O financeiro pode ficar incorreto.",
        dedupeKey: `asaas-charge-update-${eventType}`,
        context: {
          event_type: eventType,
          asaas_event_id: asaasEventId,
          asaas_payment_id: asaasPaymentId,
          charge_id: charge.id,
          project_id: charge.project_id,
          request_id: requestId,
          ms: Date.now() - start,
        },
      });
      return NextResponse.json(
        { ok: false, error: "charge_update_failed" },
        { status: 500 },
      );
    }
  }

  await markWebhookEventProcessed(admin, eventRow.id);
  revalidatePath(`/app/obras/${charge.project_id}`);
  revalidatePath("/app/financeiro");
  logServerEvent("asaas.webhook.charge_processed", {
    request_id: requestId,
    event_type: eventType,
    asaas_event_id: asaasEventId,
    asaas_payment_id: asaasPaymentId,
    charge_id: charge.id,
    project_id: charge.project_id,
    status: patch.status ?? charge.status,
    ms: Date.now() - start,
  });

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
    logServerError("asaas.webhook.register_failed", error, {
      event_type: input.eventType,
      asaas_event_id: input.asaasEventId,
      asaas_payment_id: input.asaasPaymentId,
    });
    return { ok: false };
  }

  const { data: existing, error: existingError } = await admin
    .from("billing_webhook_events")
    .select("id, processed_at")
    .eq("asaas_event_id", input.asaasEventId)
    .maybeSingle();

  if (existingError || !existing) {
    logServerError("asaas.webhook.duplicate_lookup_failed", existingError, {
      event_type: input.eventType,
      asaas_event_id: input.asaasEventId,
      asaas_payment_id: input.asaasPaymentId,
    });
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

