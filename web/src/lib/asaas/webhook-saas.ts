import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";
import {
  normalizePaidPlan,
  paidPlanFromSaasSubscriptionReference,
  type PaidPlan,
} from "@/lib/plans";

const PAID_EVENTS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const DOWNGRADE_EVENTS = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
]);

interface SaasCompanySubscription {
  id: string;
  plan: string | null;
  saas_asaas_subscription_plan?: string | null;
}

export async function processSaasSubscriptionWebhook(
  admin: AdminClient,
  payload: AsaasWebhookPayload,
): Promise<boolean> {
  const eventType = payload.event;
  const subscriptionId = payload.payment?.subscription;

  if (!eventType || !subscriptionId) return false;

  const company = await findCompanyBySaasSubscription(admin, subscriptionId);
  if (!company) return false;

  if (PAID_EVENTS.has(eventType)) {
    const targetPlan = resolvePaidPlanForWebhook(payload, company);
    if (company.plan !== targetPlan) {
      await admin.from("companies").update({ plan: targetPlan }).eq("id", company.id);
    }
    return true;
  }

  if (DOWNGRADE_EVENTS.has(eventType)) {
    if (company.plan !== "free") {
      await admin.from("companies").update({ plan: "free" }).eq("id", company.id);
    }
    return true;
  }

  return true;
}

async function findCompanyBySaasSubscription(
  admin: AdminClient,
  subscriptionId: string,
): Promise<SaasCompanySubscription | null> {
  const withPlanColumn = await admin
    .from("companies")
    .select("id, plan, saas_asaas_subscription_plan")
    .eq("saas_asaas_subscription_id", subscriptionId)
    .maybeSingle();

  if (!withPlanColumn.error) {
    return (withPlanColumn.data as SaasCompanySubscription | null) ?? null;
  }

  const legacy = await admin
    .from("companies")
    .select("id, plan")
    .eq("saas_asaas_subscription_id", subscriptionId)
    .maybeSingle();

  return (legacy.data as SaasCompanySubscription | null) ?? null;
}

function resolvePaidPlanForWebhook(
  payload: AsaasWebhookPayload,
  company: SaasCompanySubscription,
): PaidPlan {
  return (
    paidPlanFromSaasSubscriptionReference(payload.payment?.externalReference) ??
    normalizePaidPlan(company.saas_asaas_subscription_plan) ??
    "pro"
  );
}
