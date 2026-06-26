"use server";

import { revalidatePath } from "next/cache";
import { AsaasConfigError } from "@/lib/asaas/client";
import { createSaasSubscriptionCheckout } from "@/lib/asaas/saas-billing";
import { isSaasBillingSimulationEnabled } from "@/lib/billing/saas-simulation";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { normalizePaidPlan, type PaidPlan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckoutPlanActionResult =
  | { ok: true; checkoutUrl: string; simulated: boolean }
  | { ok: false; error: string };

export async function checkoutPlanAction(
  plan: string,
  document: string,
): Promise<CheckoutPlanActionResult> {
  const targetPlan = normalizePaidPlan(plan);
  if (!targetPlan) return { ok: false, error: "Plano inválido." };

  const normalizedDocument = document.replace(/\D/g, "");
  if (![11, 14].includes(normalizedDocument.length)) {
    return { ok: false, error: "Informe um CPF ou CNPJ válido." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  try {
    const result = await createSaasSubscriptionCheckout({
      plan: targetPlan,
      companyId: company.company_id,
      companyName: company.company.name,
      userEmail: user.email ?? null,
      document: normalizedDocument,
    });

    return {
      ok: true,
      checkoutUrl: result.checkoutUrl,
      simulated: false,
    };
  } catch (err) {
    if (err instanceof AsaasConfigError) {
      if (!isSaasBillingSimulationEnabled()) {
        console.warn("Asaas não configurado em ambiente que bloqueia simulação.");
        return {
          ok: false,
          error:
            "Pagamento ainda não configurado. Configure o Asaas antes de vender planos em produção.",
        };
      }

      console.warn("Asaas não configurado. Usando checkout simulado local.");
      return {
        ok: true,
        checkoutUrl: `/app/configuracoes/plano/checkout?plan=${targetPlan}&simulate=1`,
        simulated: true,
      };
    }

    console.error("Erro ao gerar checkout do Asaas:", err);
    return { ok: false, error: "Falha ao gerar link de pagamento." };
  }
}

export async function confirmPlanUpgradeAction(
  plan: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSaasBillingSimulationEnabled()) {
    return {
      ok: false,
      error:
        "Ativação manual bloqueada. Em produção, o plano só é liberado após confirmação do pagamento pelo Asaas.",
    };
  }

  const targetPlan = normalizePaidPlan(plan);
  if (!targetPlan) return { ok: false, error: "Plano inválido." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ plan: targetPlan })
    .eq("id", company.company_id);

  if (error) {
    console.error("Erro ao atualizar plano:", error);
    return { ok: false, error: "Falha ao ativar o plano." };
  }

  revalidatePath("/app/configuracoes/plano");
  revalidatePath("/app/catalogo");
  revalidatePath("/app/financeiro");

  return { ok: true };
}

export async function checkoutProAction(
  document: string,
): Promise<{ ok: boolean; error?: string; checkoutUrl?: string }> {
  const result = await checkoutPlanAction("pro", document);
  if (!result.ok) return result;
  return { ok: true, checkoutUrl: result.checkoutUrl };
}

export async function confirmProUpgradeAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  return confirmPlanUpgradeAction("pro");
}

export type { PaidPlan };
