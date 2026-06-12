import type { AsaasWebhookPayload } from "@/lib/asaas/types";
import type { ChargeStatus } from "@/lib/supabase/types";

export const ASAAS_PAYMENT_EVENT_STATUS: Partial<Record<string, ChargeStatus>> =
  {
    PAYMENT_RECEIVED: "received",
    PAYMENT_CONFIRMED: "confirmed",
    PAYMENT_OVERDUE: "overdue",
    PAYMENT_DELETED: "cancelled",
  };

const PAID_STATUSES = new Set<ChargeStatus>(["received", "confirmed"]);

export interface BillingChargeWebhookState {
  status: ChargeStatus;
  paid_at: string | null;
}

export interface BillingChargeWebhookPatch {
  status?: ChargeStatus;
  paid_at?: string;
  invoice_url?: string | null;
}

export function chargeStatusForAsaasEvent(
  eventType: string,
): ChargeStatus | null {
  return ASAAS_PAYMENT_EVENT_STATUS[eventType] ?? null;
}

export function buildBillingChargeWebhookPatch({
  eventType,
  payload,
  current,
}: {
  eventType: string;
  payload: AsaasWebhookPayload;
  current: BillingChargeWebhookState;
}): BillingChargeWebhookPatch | null {
  const nextStatus = chargeStatusForAsaasEvent(eventType);
  if (!nextStatus) return null;

  const patch: BillingChargeWebhookPatch = {};

  if (shouldApplyChargeStatus(current.status, nextStatus)) {
    patch.status = nextStatus;
    if (PAID_STATUSES.has(nextStatus) && !current.paid_at) {
      patch.paid_at = paymentTimestamp(payload);
    }
  }

  if (payload.payment?.invoiceUrl !== undefined) {
    patch.invoice_url = payload.payment.invoiceUrl;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export function shouldApplyChargeStatus(
  currentStatus: ChargeStatus,
  nextStatus: ChargeStatus,
): boolean {
  if (currentStatus === nextStatus) return true;

  // PAYMENT_RECEIVED is the strongest final state: funds are available.
  if (nextStatus === "received") return true;
  if (currentStatus === "received") return false;

  // PAYMENT_CONFIRMED means paid, but not necessarily available yet.
  if (nextStatus === "confirmed") return currentStatus !== "cancelled";
  if (currentStatus === "confirmed") return false;

  // Once cancelled, only a real paid event should resurrect it.
  if (currentStatus === "cancelled") return false;

  if (nextStatus === "cancelled") return !PAID_STATUSES.has(currentStatus);
  if (nextStatus === "overdue") return !PAID_STATUSES.has(currentStatus);

  return true;
}

export function paymentTimestamp(payload: AsaasWebhookPayload): string {
  const raw =
    payload.payment?.clientPaymentDate ?? payload.payment?.paymentDate ?? null;
  if (!raw) return new Date().toISOString();
  if (raw.includes("T")) return raw;
  return `${raw}T00:00:00-03:00`;
}

export function safePaymentExternalReference(
  payload: AsaasWebhookPayload,
): string | null {
  const externalReference = payload.payment?.externalReference?.trim();
  if (!externalReference) return null;
  return isUuidLike(externalReference) ? externalReference : null;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
