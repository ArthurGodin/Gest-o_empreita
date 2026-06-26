import "server-only";

import { asaasRequest } from "@/lib/asaas/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysBR } from "@/lib/dates";
import {
  makeSaasSubscriptionReference,
  PLAN_DEFINITIONS,
  type PaidPlan,
} from "@/lib/plans";

interface AsaasCustomerResponse {
  id: string;
}

interface AsaasSubscriptionResponse {
  id: string;
}

interface AsaasPaymentResponse {
  id: string;
  invoiceUrl: string;
  status: string;
}

interface AsaasCustomerPayload extends Record<string, string | undefined> {
  name: string;
  email?: string;
  cpfCnpj?: string;
  externalReference?: string;
}

async function ensureSaasCustomer(
  companyId: string,
  name: string,
  email: string | null,
  document: string | null,
): Promise<string> {
  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("saas_asaas_customer_id")
    .eq("id", companyId)
    .single();

  if (company?.saas_asaas_customer_id) {
    return company.saas_asaas_customer_id;
  }

  const payload: AsaasCustomerPayload = {
    name,
    externalReference: `COMPANY_${companyId}`,
  };
  if (email) payload.email = email;
  if (document) payload.cpfCnpj = document;

  const asaasCustomer = await asaasRequest<AsaasCustomerResponse>("/customers", {
    method: "POST",
    body: payload,
  });

  const { error } = await admin
    .from("companies")
    .update({ saas_asaas_customer_id: asaasCustomer.id })
    .eq("id", companyId);

  if (error) {
    throw new Error("Não foi possível salvar o cliente SaaS do Asaas.");
  }

  return asaasCustomer.id;
}

export async function createSaasSubscriptionCheckout({
  plan,
  companyId,
  companyName,
  userEmail,
  document,
}: {
  plan: PaidPlan;
  companyId: string;
  companyName: string;
  userEmail: string | null;
  document: string;
}): Promise<{ checkoutUrl: string }> {
  const admin = createAdminClient();
  const planDefinition = PLAN_DEFINITIONS[plan];
  const customerId = await ensureSaasCustomer(
    companyId,
    companyName,
    userEmail,
    document,
  );

  const subscription = await asaasRequest<AsaasSubscriptionResponse>(
    "/subscriptions",
    {
      method: "POST",
      body: {
        customer: customerId,
        billingType: "UNDEFINED",
        value: planDefinition.priceCents / 100,
        nextDueDate: addDaysBR(0),
        cycle: "MONTHLY",
        description: `Assinatura ${planDefinition.label} - Prumo`,
        externalReference: makeSaasSubscriptionReference(plan, companyId),
      },
    },
  );

  const { error: subscriptionError } = await admin
    .from("companies")
    .update({
      saas_asaas_subscription_id: subscription.id,
      saas_asaas_subscription_plan: plan,
    })
    .eq("id", companyId);

  if (subscriptionError) {
    throw new Error("Não foi possível salvar a assinatura SaaS da empresa.");
  }

  const payments = await asaasRequest<{ data: AsaasPaymentResponse[] }>(
    `/payments?subscription=${subscription.id}`,
  );

  const firstPayment = payments.data[0];
  if (!firstPayment?.invoiceUrl) {
    throw new Error("Não foi possível gerar o link de checkout do Asaas.");
  }

  return { checkoutUrl: firstPayment.invoiceUrl };
}

export async function createProSubscriptionCheckout(
  companyId: string,
  companyName: string,
  userEmail: string | null,
  document: string,
): Promise<{ checkoutUrl: string }> {
  return createSaasSubscriptionCheckout({
    plan: "pro",
    companyId,
    companyName,
    userEmail,
    document,
  });
}
