"use server";

import { revalidatePath } from "next/cache";
import { sendOperationalAlert } from "@/lib/alerts";
import { AsaasApiError, AsaasConfigError } from "@/lib/asaas/client";
import {
  cancelCompanySaasPlan,
  createSaasSubscriptionCheckout,
  SaasCheckoutBlockedError,
} from "@/lib/asaas/saas-billing";
import { isSaasBillingSimulationEnabled } from "@/lib/billing/saas-simulation";
import { logServerError, logServerEvent, logServerWarning } from "@/lib/log";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { normalizePaidPlan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckoutPlanActionResult =
  | { ok: true; checkoutUrl: string; simulated: boolean; reused?: boolean }
  | { ok: false; error: string };

export async function cancelCurrentPlanAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessao expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa nao encontrada." };
  if (company.role !== "owner") {
    return {
      ok: false,
      error: "Somente o proprietario da empresa pode cancelar a assinatura.",
    };
  }

  try {
    await cancelCompanySaasPlan(company.company_id);
    logServerEvent("saas.plan.cancelled", {
      company_id: company.company_id,
      user_id: user.id,
    });
    revalidatePath("/app/configuracoes/plano");
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    logServerError("saas.plan.cancellation_failed", error, {
      company_id: company.company_id,
      user_id: user.id,
    });
    await sendOperationalAlert({
      area: "saas_checkout",
      severity: "critical",
      title: "Falha ao cancelar assinatura SaaS",
      message:
        "O proprietario tentou cancelar o plano, mas a cobranca recorrente ou a atualizacao local falhou.",
      dedupeKey: `saas-cancellation-failed-${company.company_id}`,
      context: {
        company_id: company.company_id,
        user_id: user.id,
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
    return {
      ok: false,
      error:
        "Nao foi possivel confirmar o cancelamento completo. Um alerta foi enviado; recarregue a pagina e tente novamente em instantes.",
    };
  }
}

export async function checkoutPlanAction(
  plan: string,
): Promise<CheckoutPlanActionResult> {
  const start = Date.now();
  const targetPlan = normalizePaidPlan(plan);
  if (!targetPlan) return { ok: false, error: "Plano invÃ¡lido." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SessÃ£o expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa nÃ£o encontrada." };
  if (company.role !== "owner") {
    return {
      ok: false,
      error: "Somente o proprietario da empresa pode contratar um plano.",
    };
  }

  try {
    const result = await createSaasSubscriptionCheckout({
      plan: targetPlan,
      companyId: company.company_id,
      companyName: company.company.name,
    });

    logServerEvent("saas.checkout.created", {
      plan: targetPlan,
      company_id: company.company_id,
      reused: result.reused,
      ms: Date.now() - start,
    });

    return {
      ok: true,
      checkoutUrl: result.checkoutUrl,
      simulated: false,
      reused: result.reused,
    };
  } catch (err) {
    if (err instanceof SaasCheckoutBlockedError) {
      logServerWarning("saas.checkout.blocked", {
        plan: targetPlan,
        company_id: company.company_id,
        reason: err.code,
        has_checkout_url: Boolean(err.checkoutUrl),
        ms: Date.now() - start,
      });
      return {
        ok: false,
        error: err.checkoutUrl
          ? `${err.message} Abra o pagamento pendente pela tela de planos.`
          : err.message,
      };
    }

    if (err instanceof AsaasConfigError) {
      if (!isSaasBillingSimulationEnabled()) {
        logServerWarning("saas.checkout.asaas_not_configured", {
          plan: targetPlan,
          company_id: company.company_id,
          simulation_allowed: false,
          ms: Date.now() - start,
        });
        console.warn("Asaas nÃ£o configurado em ambiente que bloqueia simulaÃ§Ã£o.");
        await sendOperationalAlert({
          area: "saas_checkout",
          severity: "critical",
          title: "Checkout SaaS sem Asaas configurado",
          message:
            "Um usuario tentou assinar um plano pago, mas o Asaas nao esta configurado em ambiente que bloqueia simulacao.",
          dedupeKey: `saas-checkout-asaas-not-configured-${targetPlan}`,
          context: {
            plan: targetPlan,
            company_id: company.company_id,
            ms: Date.now() - start,
          },
        });
        return {
          ok: false,
          error:
            "Pagamento ainda nÃ£o configurado. Configure o Asaas antes de vender planos em produÃ§Ã£o.",
        };
      }

      console.warn("Asaas nÃ£o configurado. Usando checkout simulado local.");
      logServerWarning("saas.checkout.simulated", {
        plan: targetPlan,
        company_id: company.company_id,
        simulation_allowed: true,
        ms: Date.now() - start,
      });
      return {
        ok: true,
        checkoutUrl: `/app/configuracoes/plano/checkout?plan=${targetPlan}&simulate=1`,
        simulated: true,
      };
    }

    console.error("Erro ao gerar checkout do Asaas:", err);
    logServerError("saas.checkout.failed", err, {
      plan: targetPlan,
      company_id: company.company_id,
      ms: Date.now() - start,
    });
    await sendOperationalAlert({
      area: "saas_checkout",
      severity: "critical",
      title: "Falha ao gerar checkout SaaS",
      message:
        "A geracao do link de pagamento do plano falhou. Isso pode travar venda ou upgrade.",
      dedupeKey: `saas-checkout-failed-${targetPlan}`,
      context: {
        plan: targetPlan,
        company_id: company.company_id,
        error_name: err instanceof Error ? err.name : "unknown",
        ms: Date.now() - start,
      },
    });
    if (err instanceof AsaasApiError) {
      if (err.status === 401 || err.status === 403) {
        return {
          ok: false,
          error:
            "Asaas recusou a chave configurada. A API Key nao pertence a URL do ambiente. Use chave de producao com https://api.asaas.com/v3 ou chave sandbox com https://api-sandbox.asaas.com/v3.",
        };
      }

      return {
        ok: false,
        error: "Asaas nao conseguiu gerar o pagamento agora. Confira os dados e tente novamente.",
      };
    }

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
        "AtivaÃ§Ã£o manual bloqueada. Em produÃ§Ã£o, o plano sÃ³ Ã© liberado apÃ³s confirmaÃ§Ã£o do pagamento pelo Asaas.",
    };
  }

  const targetPlan = normalizePaidPlan(plan);
  if (!targetPlan) return { ok: false, error: "Plano invÃ¡lido." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SessÃ£o expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa nÃ£o encontrada." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ plan: targetPlan })
    .eq("id", company.company_id);

  if (error) {
    logServerError("saas.plan.manual_activation_failed", error, {
      plan: targetPlan,
      company_id: company.company_id,
    });
    await sendOperationalAlert({
      area: "saas_checkout",
      severity: "warning",
      title: "Falha na ativacao simulada de plano",
      message:
        "A ativacao manual/simulada de plano falhou. Isso afeta demos e validacoes fora do pagamento real.",
      dedupeKey: `saas-manual-activation-failed-${targetPlan}`,
      context: {
        plan: targetPlan,
        company_id: company.company_id,
        error_code: error.code ?? null,
      },
    });
    console.error("Erro ao atualizar plano:", error);
    return { ok: false, error: "Falha ao ativar o plano." };
  }

  logServerEvent("saas.plan.manual_activation_succeeded", {
    plan: targetPlan,
    company_id: company.company_id,
  });

  revalidatePath("/app/configuracoes/plano");
  revalidatePath("/app/catalogo");
  revalidatePath("/app/financeiro");

  return { ok: true };
}

export async function checkoutProAction(): Promise<{
  ok: boolean;
  error?: string;
  checkoutUrl?: string;
}> {
  const result = await checkoutPlanAction("pro");
  if (!result.ok) return result;
  return { ok: true, checkoutUrl: result.checkoutUrl };
}

export async function confirmProUpgradeAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  return confirmPlanUpgradeAction("pro");
}
