export type AppPlan = "free" | "pro" | "ultimate";
export type PaidPlan = Exclude<AppPlan, "free">;

export interface PlanDefinition {
  key: AppPlan;
  name: string;
  label: string;
  priceCents: number;
  priceLabel: string;
  description: string;
  cta: string;
  features: string[];
  checkoutHighlights: string[];
}

export const PLAN_DEFINITIONS: Record<AppPlan, PlanDefinition> = {
  free: {
    key: "free",
    name: "Starter",
    label: "Starter",
    priceCents: 0,
    priceLabel: "Grátis",
    description: "Para testar o Prumo e enviar as primeiras propostas.",
    cta: "Plano em uso",
    features: [
      "Até 3 orçamentos por mês",
      "1 obra simultânea",
      "Link público para o cliente aprovar",
      "PDF com marca do Prumo",
    ],
    checkoutHighlights: [],
  },
  pro: {
    key: "pro",
    name: "Pro",
    label: "Plano Pro",
    priceCents: 9700,
    priceLabel: "R$ 97",
    description:
      "Para empreiteiros que querem vender melhor, controlar obras e cobrar com Pix.",
    cta: "Assinar Pro",
    features: [
      "Orçamentos e obras ilimitadas",
      "Link público premium com aceite digital",
      "PDF sem marca d'água",
      "Cobrança Pix para entrada e saldo",
      "Diário de obra com fotos",
      "Dashboard financeiro da obra",
    ],
    checkoutHighlights: [
      "Orçamentos e obras ilimitadas",
      "Cobrança Pix via Asaas",
      "PDF e link público sem marca d'água",
      "Controle financeiro por obra",
    ],
  },
  ultimate: {
    key: "ultimate",
    name: "Ultimate",
    label: "Plano Ultimate",
    priceCents: 24700,
    priceLabel: "R$ 247",
    description:
      "Para quem quer escala: catálogo em lote, exportação contábil e operação mais profissional.",
    cta: "Assinar Ultimate",
    features: [
      "Tudo do Pro",
      "Importação de catálogo por CSV",
      "Exportação contábil",
      "Base de itens pronta para orçar mais rápido",
      "Acompanhamento prioritário de implantação",
      "Preparado para times e processos maiores",
    ],
    checkoutHighlights: [
      "Tudo do Pro incluido",
      "Importação de catálogo por planilha",
      "Exportação contábil para fechamento mensal",
      "Acompanhamento prioritário de implantação",
    ],
  },
};

export const PLAN_ORDER: Record<AppPlan, number> = {
  free: 0,
  pro: 1,
  ultimate: 2,
};

export function normalizeAppPlan(value: string | null | undefined): AppPlan {
  if (value === "pro" || value === "ultimate") return value;
  return "free";
}

export function normalizePaidPlan(
  value: string | null | undefined,
): PaidPlan | null {
  return value === "pro" || value === "ultimate" ? value : null;
}

export function isPlanAtLeast(current: string | null | undefined, target: AppPlan) {
  return PLAN_ORDER[normalizeAppPlan(current)] >= PLAN_ORDER[target];
}

export function formatPlanPrice(plan: AppPlan) {
  const definition = PLAN_DEFINITIONS[plan];
  if (definition.priceCents === 0) return "Grátis";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(definition.priceCents / 100);
}

export function makeSaasSubscriptionReference(plan: PaidPlan, companyId: string) {
  return `SUB_${plan.toUpperCase()}_${companyId}`;
}

export function paidPlanFromSaasSubscriptionReference(
  reference: string | null | undefined,
): PaidPlan | null {
  const normalized = reference?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.startsWith("SUB_ULTIMATE_")) return "ultimate";
  if (normalized.startsWith("SUB_PRO_")) return "pro";
  return null;
}
