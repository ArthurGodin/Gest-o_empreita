import "server-only";

import { asaasRequest } from "@/lib/asaas/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysBR } from "@/lib/dates";

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

/**
 * Cria ou recupera o Customer no Asaas para a EMPRESA (SaaS Billing)
 */
async function ensureSaasCustomer(
  companyId: string,
  name: string,
  email: string | null,
  document: string | null
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

  // Se não tem, cria no Asaas
  const payload: any = { name };
  if (email) payload.email = email;
  if (document) payload.cpfCnpj = document;
  
  // Usamos um externalReference para saber que é a empresa
  payload.externalReference = `COMPANY_${companyId}`;

  const asaasCustomer = await asaasRequest<AsaasCustomerResponse>("/customers", {
    method: "POST",
    body: payload,
  });

  await admin
    .from("companies")
    .update({ saas_asaas_customer_id: asaasCustomer.id })
    .eq("id", companyId);

  return asaasCustomer.id;
}

/**
 * Cria uma assinatura mensal no Asaas e retorna a URL de pagamento do 1º mês
 */
export async function createProSubscriptionCheckout(
  companyId: string,
  companyName: string,
  userEmail: string | null,
): Promise<{ checkoutUrl: string }> {
  const admin = createAdminClient();
  
  const customerId = await ensureSaasCustomer(companyId, companyName, userEmail, null);

  // Criar assinatura
  const subscription = await asaasRequest<AsaasSubscriptionResponse>("/subscriptions", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "UNDEFINED", // Cliente escolhe: Pix, Cartão, Boleto
      value: 97.00,
      nextDueDate: addDaysBR(0), // Vence hoje (cobra agora)
      cycle: "MONTHLY",
      description: "Assinatura Plano PRO - Gestão Empreita",
      externalReference: `SUB_PRO_${companyId}`,
    },
  });

  // Salvar o ID da assinatura na empresa
  await admin
    .from("companies")
    .update({ saas_asaas_subscription_id: subscription.id })
    .eq("id", companyId);

  // Buscar a cobrança gerada para essa assinatura para pegar o Link de Pagamento (InvoiceUrl)
  // O Asaas gera a cobrança imediatamente quando a data de vencimento é próxima
  const payments = await asaasRequest<{ data: AsaasPaymentResponse[] }>(
    `/payments?subscription=${subscription.id}`
  );

  const firstPayment = payments.data[0];
  if (!firstPayment?.invoiceUrl) {
    throw new Error("Não foi possível gerar o link de checkout do Asaas.");
  }

  return { checkoutUrl: firstPayment.invoiceUrl };
}
