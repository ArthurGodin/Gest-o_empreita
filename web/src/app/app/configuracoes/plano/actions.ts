"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";

export async function checkoutProAction(): Promise<{ ok: boolean; error?: string; checkoutUrl?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  // Aqui você chamaria a API do Asaas para gerar o Link de Pagamento.
  // Como estamos sem a integração real para o SaaS Billing,
  // vamos redirecionar para uma página de Checkout nativa (simulada).
  
  return { 
    ok: true, 
    checkoutUrl: "/app/configuracoes/plano/checkout" 
  };
}

export async function confirmProUpgradeAction(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const admin = createAdminClient();

  const { error } = await admin
    .from("companies")
    .update({ plan: "pro" })
    .eq("id", company.company_id);

  if (error) {
    console.error("Erro ao atualizar plano (Admin):", error);
    return { ok: false, error: "Falha ao ativar o plano." };
  }

  return { ok: true };
}
