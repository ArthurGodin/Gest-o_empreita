"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";

import { createProSubscriptionCheckout } from "@/lib/asaas/saas-billing";
import { AsaasConfigError } from "@/lib/asaas/client";

export async function checkoutProAction(document: string): Promise<{ ok: boolean; error?: string; checkoutUrl?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  try {
    // Integração Real de Faturamento SaaS!
    const result = await createProSubscriptionCheckout(
      company.company_id,
      company.company.name,
      user.email ?? null,
      document
    );

    return { 
      ok: true, 
      checkoutUrl: result.checkoutUrl 
    };
  } catch (err) {
    if (err instanceof AsaasConfigError) {
      // Fallback para o simulador se a chave do Asaas não estiver configurada no .env
      console.warn("Asaas não configurado. Redirecionando para o Checkout Simulado.");
      return { 
        ok: true, 
        checkoutUrl: "/app/configuracoes/plano/checkout" 
      };
    }
    console.error("Erro ao gerar checkout do Asaas:", err);
    return { ok: false, error: "Falha ao gerar link de pagamento." };
  }
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
