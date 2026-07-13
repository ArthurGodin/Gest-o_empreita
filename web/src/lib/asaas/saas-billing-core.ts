export interface SaasPaymentSummary {
  id: string;
  status?: string | null;
  invoiceUrl?: string | null;
}

export interface SaasSubscriptionSummary {
  id: string;
  status?: string | null;
  deleted?: boolean | null;
}

export const OPEN_SAAS_PAYMENT_STATUSES = new Set([
  "PENDING",
  "OVERDUE",
  "AWAITING_RISK_ANALYSIS",
]);

export const PAID_SAAS_PAYMENT_STATUSES = new Set(["RECEIVED", "CONFIRMED"]);

export function normalizeAsaasStatus(status: string | null | undefined) {
  return status?.trim().toUpperCase() ?? null;
}

export function findReusableCheckoutPayment(
  payments: SaasPaymentSummary[],
): SaasPaymentSummary | null {
  return (
    payments.find(
      (payment) =>
        Boolean(payment.invoiceUrl) &&
        OPEN_SAAS_PAYMENT_STATUSES.has(normalizeAsaasStatus(payment.status) ?? ""),
    ) ??
    payments.find((payment) => Boolean(payment.invoiceUrl)) ??
    null
  );
}

export function hasPaidSubscriptionPayment(payments: SaasPaymentSummary[]) {
  return payments.some((payment) =>
    PAID_SAAS_PAYMENT_STATUSES.has(normalizeAsaasStatus(payment.status) ?? ""),
  );
}

export function isSubscriptionInactive(
  subscription: SaasSubscriptionSummary | null,
) {
  if (!subscription) return true;
  const status = normalizeAsaasStatus(subscription.status);
  return Boolean(
    subscription.deleted ||
      status === "INACTIVE" ||
      status === "CANCELED" ||
      status === "CANCELLED",
  );
}
