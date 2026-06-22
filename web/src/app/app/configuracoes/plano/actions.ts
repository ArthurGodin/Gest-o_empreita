"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";

export async function checkoutProAction(): Promise<{ ok: boolean; error?: string; checkoutUrl?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const admin = createAdminClient();
  
  // Aqui você integraria com a API de Assinaturas do Asaas
  // Exemplo simulado para faturamento real:
  // const checkout = await asaas.createPaymentLink({ value: 97.00, billingType: 'UNDEFINED' ... });
  // return { ok: true, checkoutUrl: checkout.url };

  // Por enquanto, faremos o upgrade instantâneo para fins de demonstração (ou um bypass caso não haja Link do Asaas configurado).
  // TODO: Integrar Checkout Asaas Real aqui.

  const { error } = await admin
    .from("companies")
    .update({ plan: "pro" })
    .eq("id", company.company_id);

  if (error) {
    console.error("Erro ao atualizar plano (Admin):", error);
    return { ok: false, error: "Falha ao atualizar o plano." };
  }

  return { ok: true };
}
