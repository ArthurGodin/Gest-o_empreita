import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";
import {
  cancelSaasSubscription,
  cancelSupersededSaasSubscriptions,
  deactivateSaasPaymentLink,
  parseSaasPaymentLinkStorageId,
  saasPaymentLinkStorageLikePattern,
} from "@/lib/asaas/saas-billing";
import {
  companyIdFromSaasSubscriptionReference,
  normalizeAppPlan,
  normalizePaidPlan,
  paidPlanFromSaasSubscriptionReference,
  PLAN_ORDER,
  type AppPlan,
  type PaidPlan,
} from "@/lib/plans";
import { logServerError, logServerEvent } from "@/lib/log";

const PAID_EVENTS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const DOWNGRADE_EVENTS = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
]);

const COMPANY_SELECT =
  "id, plan, saas_asaas_customer_id, saas_asaas_subscription_id, saas_asaas_subscription_plan, saas_pending_payment_link_id, saas_pending_payment_link_url, saas_pending_plan, saas_pending_checkout_token, saas_pending_checkout_started_at";

interface SaasCompanySubscription {
  id: string;
  plan: string | null;
  saas_asaas_customer_id: string | null;
  saas_asaas_subscription_id: string | null;
  saas_asaas_subscription_plan: string | null;
  saas_pending_payment_link_id: string | null;
  saas_pending_payment_link_url: string | null;
  saas_pending_plan: string | null;
  saas_pending_checkout_token: string | null;
  saas_pending_checkout_started_at: string | null;
}

export async function processSaasSubscriptionWebhook(
  admin: AdminClient,
  payload: AsaasWebhookPayload,
): Promise<boolean> {
  const eventType = payload.event;
  if (!eventType) return false;

  const subscriptionId = payload.payment?.subscription?.trim() || null;
  const paymentLinkId = payload.payment?.paymentLink?.trim() || null;
  const externalReference = payload.payment?.externalReference?.trim() || null;

  const company = await findCompanyForSaasWebhook(admin, {
    subscriptionId,
    paymentLinkId,
    externalReference,
  });
  if (!company) return false;

  if (PAID_EVENTS.has(eventType)) {
    return activatePaidSaasSubscription(admin, company, payload, {
      eventType,
      subscriptionId,
      paymentLinkId,
    });
  }

  if (DOWNGRADE_EVENTS.has(eventType)) {
    return processInvalidSaasPayment(admin, company, payload, {
      eventType,
      subscriptionId,
      paymentLinkId,
    });
  }

  return true;
}

async function activatePaidSaasSubscription(
  admin: AdminClient,
  company: SaasCompanySubscription,
  payload: AsaasWebhookPayload,
  event: {
    eventType: string;
    subscriptionId: string | null;
    paymentLinkId: string | null;
  },
): Promise<true> {
  const currentPlan = normalizeAppPlan(company.plan);
  const targetPlan = resolvePaidPlanForWebhook(payload, company);
  const activeSubscriptionId = getActiveSubscriptionId(company);
  const pendingMatchesEvent = paymentLinkMatchesCompanyPending(
    company,
    event.paymentLinkId,
  );

  if (PLAN_ORDER[targetPlan] < PLAN_ORDER[currentPlan]) {
    await cleanupStalePaidSubscription(company, event);
    if (pendingMatchesEvent) {
      await clearPendingCheckout(admin, company, event.paymentLinkId);
    }

    logServerEvent("saas.webhook.stale_paid_ignored", {
      company_id: company.id,
      current_plan: currentPlan,
      event_plan: targetPlan,
      event_type: event.eventType,
      subscription_id: event.subscriptionId,
      payment_link_id: event.paymentLinkId,
    });
    return true;
  }

  if (event.paymentLinkId && !event.subscriptionId) {
    throw new Error("saas_subscription_id_missing_for_paid_payment_link");
  }

  const paymentLinkToDeactivate =
    event.paymentLinkId ??
    (normalizePaidPlan(company.saas_pending_plan) === targetPlan
      ? company.saas_pending_payment_link_id
      : null);

  try {
    await Promise.all([
      event.subscriptionId
        ? cancelSupersededSaasSubscriptions({
            customerId: company.saas_asaas_customer_id,
            companyId: company.id,
            keepSubscriptionId: event.subscriptionId,
            knownSubscriptionId: activeSubscriptionId,
          })
        : Promise.resolve(),
      paymentLinkToDeactivate
        ? deactivateSaasPaymentLink(paymentLinkToDeactivate)
        : Promise.resolve(),
    ]);
  } catch (error) {
    logServerError("saas.webhook.activation_cleanup_failed", error, {
      company_id: company.id,
      from_plan: currentPlan,
      to_plan: targetPlan,
      event_type: event.eventType,
      subscription_id: event.subscriptionId,
      payment_link_id: paymentLinkToDeactivate,
    });
    throw new Error("saas_subscription_activation_cleanup_failed");
  }

  const nextSubscriptionId =
    event.subscriptionId ??
    (targetPlan === currentPlan ? activeSubscriptionId : null);
  const { error } = await admin
    .from("companies")
    .update({
      plan: targetPlan,
      saas_asaas_subscription_plan: targetPlan,
      saas_asaas_subscription_id: nextSubscriptionId,
      ...pendingCheckoutClearPatch(),
    })
    .eq("id", company.id);

  if (error) {
    logServerError("saas.webhook.activate_failed", error, {
      company_id: company.id,
      from_plan: currentPlan,
      to_plan: targetPlan,
      event_type: event.eventType,
      subscription_id: event.subscriptionId,
      payment_link_id: event.paymentLinkId,
    });
    throw new Error("saas_subscription_activation_failed");
  }

  logServerEvent("saas.webhook.activated", {
    company_id: company.id,
    from_plan: currentPlan,
    to_plan: targetPlan,
    event_type: event.eventType,
    subscription_id: nextSubscriptionId,
    payment_link_id: event.paymentLinkId,
  });
  return true;
}

async function processInvalidSaasPayment(
  admin: AdminClient,
  company: SaasCompanySubscription,
  payload: AsaasWebhookPayload,
  event: {
    eventType: string;
    subscriptionId: string | null;
    paymentLinkId: string | null;
  },
): Promise<true> {
  const currentPlan = normalizeAppPlan(company.plan);
  const targetPlan = resolvePaidPlanForWebhook(payload, company);
  const activeSubscriptionId = getActiveSubscriptionId(company);
  const pendingMatchesEvent = paymentLinkMatchesCompanyPending(
    company,
    event.paymentLinkId,
  );
  const isPendingUpgrade =
    PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan] &&
    event.subscriptionId !== activeSubscriptionId;

  if (pendingMatchesEvent || isPendingUpgrade) {
    const pendingLinkId =
      event.paymentLinkId ?? company.saas_pending_payment_link_id;
    await Promise.all([
      event.subscriptionId && event.subscriptionId !== activeSubscriptionId
        ? cancelSaasSubscription(event.subscriptionId)
        : Promise.resolve(),
      pendingLinkId
        ? deactivateSaasPaymentLink(pendingLinkId)
        : Promise.resolve(),
    ]);
    await clearPendingCheckout(admin, company, pendingLinkId);

    logServerEvent("saas.webhook.pending_checkout_invalidated", {
      company_id: company.id,
      preserved_plan: currentPlan,
      pending_plan: targetPlan,
      event_type: event.eventType,
      subscription_id: event.subscriptionId,
      payment_link_id: pendingLinkId,
    });
    return true;
  }

  const isCurrentSubscription = Boolean(
    activeSubscriptionId && event.subscriptionId === activeSubscriptionId,
  );
  if (!isCurrentSubscription) {
    logServerEvent("saas.webhook.stale_invalid_payment_ignored", {
      company_id: company.id,
      current_plan: currentPlan,
      event_plan: targetPlan,
      event_type: event.eventType,
      active_subscription_id: activeSubscriptionId,
      event_subscription_id: event.subscriptionId,
      payment_link_id: event.paymentLinkId,
    });
    return true;
  }

  const { error } = await admin
    .from("companies")
    .update({
      plan: "free",
      saas_asaas_subscription_id: null,
      saas_asaas_subscription_plan: null,
      ...pendingCheckoutClearPatch(),
    })
    .eq("id", company.id);

  if (error) {
    logServerError("saas.webhook.downgrade_failed", error, {
      company_id: company.id,
      from_plan: currentPlan,
      to_plan: "free",
      event_type: event.eventType,
      subscription_id: event.subscriptionId,
      payment_link_id: event.paymentLinkId,
    });
    throw new Error("saas_subscription_downgrade_failed");
  }

  logServerEvent("saas.webhook.downgraded", {
    company_id: company.id,
    from_plan: currentPlan,
    to_plan: "free",
    event_type: event.eventType,
    subscription_id: event.subscriptionId,
    payment_link_id: event.paymentLinkId,
  });
  return true;
}

async function cleanupStalePaidSubscription(
  company: SaasCompanySubscription,
  event: { subscriptionId: string | null; paymentLinkId: string | null },
) {
  const activeSubscriptionId = getActiveSubscriptionId(company);
  await Promise.all([
    event.subscriptionId && event.subscriptionId !== activeSubscriptionId
      ? cancelSaasSubscription(event.subscriptionId)
      : Promise.resolve(),
    event.paymentLinkId
      ? deactivateSaasPaymentLink(event.paymentLinkId)
      : Promise.resolve(),
  ]);
}

async function clearPendingCheckout(
  admin: AdminClient,
  company: SaasCompanySubscription,
  paymentLinkId: string | null,
) {
  const legacyPaymentLink = parseSaasPaymentLinkStorageId(
    company.saas_asaas_subscription_id,
  );
  const clearsLegacyLink = Boolean(
    legacyPaymentLink &&
      (!paymentLinkId || legacyPaymentLink.id === paymentLinkId),
  );
  const { error } = await admin
    .from("companies")
    .update({
      ...pendingCheckoutClearPatch(),
      ...(clearsLegacyLink
        ? {
            saas_asaas_subscription_id: null,
            saas_asaas_subscription_plan: null,
          }
        : {}),
    })
    .eq("id", company.id);

  if (error) throw new Error("saas_pending_checkout_clear_failed");
}

function pendingCheckoutClearPatch() {
  return {
    saas_pending_payment_link_id: null,
    saas_pending_payment_link_url: null,
    saas_pending_plan: null,
    saas_pending_checkout_token: null,
    saas_pending_checkout_started_at: null,
  };
}

function getActiveSubscriptionId(company: SaasCompanySubscription) {
  return parseSaasPaymentLinkStorageId(company.saas_asaas_subscription_id)
    ? null
    : company.saas_asaas_subscription_id;
}

function paymentLinkMatchesCompanyPending(
  company: SaasCompanySubscription,
  paymentLinkId: string | null,
) {
  if (!paymentLinkId) return false;
  if (company.saas_pending_payment_link_id === paymentLinkId) return true;
  return (
    parseSaasPaymentLinkStorageId(company.saas_asaas_subscription_id)?.id ===
    paymentLinkId
  );
}

async function findCompanyForSaasWebhook(
  admin: AdminClient,
  input: {
    subscriptionId: string | null;
    paymentLinkId: string | null;
    externalReference: string | null;
  },
): Promise<SaasCompanySubscription | null> {
  if (input.subscriptionId) {
    const company = await findCompanyByColumn(
      admin,
      "saas_asaas_subscription_id",
      input.subscriptionId,
    );
    if (company) return company;
  }

  if (input.paymentLinkId) {
    const company = await findCompanyByPaymentLink(admin, input.paymentLinkId);
    if (company) return company;
  }

  const companyId = companyIdFromSaasSubscriptionReference(input.externalReference);
  if (companyId) return findCompanyByColumn(admin, "id", companyId);

  return null;
}

async function findCompanyByColumn(
  admin: AdminClient,
  column: string,
  value: string,
): Promise<SaasCompanySubscription | null> {
  const result = await admin
    .from("companies")
    .select(COMPANY_SELECT)
    .eq(column, value)
    .maybeSingle();

  if (result.error) throw result.error;
  return (result.data as SaasCompanySubscription | null) ?? null;
}

async function findCompanyByPaymentLink(
  admin: AdminClient,
  paymentLinkId: string,
): Promise<SaasCompanySubscription | null> {
  const pending = await findCompanyByColumn(
    admin,
    "saas_pending_payment_link_id",
    paymentLinkId,
  );
  if (pending) return pending;

  const legacy = await admin
    .from("companies")
    .select(COMPANY_SELECT)
    .like(
      "saas_asaas_subscription_id",
      saasPaymentLinkStorageLikePattern(paymentLinkId),
    )
    .maybeSingle();

  if (legacy.error) throw legacy.error;
  return (legacy.data as SaasCompanySubscription | null) ?? null;
}

function resolvePaidPlanForWebhook(
  payload: AsaasWebhookPayload,
  company: SaasCompanySubscription,
): PaidPlan {
  const paymentLinkId = payload.payment?.paymentLink?.trim() || null;
  const pendingPlan = paymentLinkMatchesCompanyPending(company, paymentLinkId)
    ? normalizePaidPlan(company.saas_pending_plan) ??
      normalizePaidPlan(company.saas_asaas_subscription_plan)
    : null;

  return (
    paidPlanFromSaasSubscriptionReference(payload.payment?.externalReference) ??
    pendingPlan ??
    normalizePaidPlan(company.saas_asaas_subscription_plan) ??
    (normalizeAppPlan(company.plan) === "free"
      ? "pro"
      : (normalizeAppPlan(company.plan) as Exclude<AppPlan, "free">))
  );
}
