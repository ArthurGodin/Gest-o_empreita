import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AsaasWebhookPayload } from "@/lib/asaas/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function processSaasSubscriptionWebhook(
  admin: AdminClient,
  payload: AsaasWebhookPayload
): Promise<boolean> {
  const eventType = payload.event;
  const subscriptionId = payload.payment?.subscription;

  if (!subscriptionId) return false;

  // Busca a empresa que tem essa assinatura no Asaas
  const { data: company } = await admin
    .from("companies")
    .select("id, plan")
    .eq("saas_asaas_subscription_id", subscriptionId)
    .single();

  if (!company) return false; // Não é uma assinatura do nosso SaaS

  // Quando o pagamento for recebido/confirmado, liberamos o plano PRO
  if (eventType === "PAYMENT_RECEIVED" || eventType === "PAYMENT_CONFIRMED") {
    if (company.plan !== "pro") {
      await admin
        .from("companies")
        .update({ plan: "pro" })
        .eq("id", company.id);
    }
    return true;
  }

  // Se o pagamento atrasar muito ou for estornado/devolvido/cancelado, revogamos o plano PRO
  const downgradeEvents = [
    "PAYMENT_OVERDUE",
    "PAYMENT_DELETED",
    "PAYMENT_REFUNDED",
    "PAYMENT_CHARGEBACK_REQUESTED",
  ];
  
  if (eventType && downgradeEvents.includes(eventType)) {
    if (company.plan !== "free") {
      await admin
        .from("companies")
        .update({ plan: "free" })
        .eq("id", company.id);
    }
    return true;
  }

  // Outros eventos da assinatura (gerada, atualizada, etc)
  return true;
}
