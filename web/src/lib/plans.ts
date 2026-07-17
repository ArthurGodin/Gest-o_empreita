export type AppPlan = "free" | "pro" | "ultimate";
export type PaidPlan = Exclude<AppPlan, "free">;
export const FREE_MONTHLY_QUOTE_LIMIT = 3;

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
    name: "Grátis",
    label: "Plano Grátis",
    priceCents: 0,
    priceLabel: "Grátis",
    description: "Para conhecer o Prumo e enviar as primeiras propostas.",
    cta: "Plano em uso",
    features: [
      "Até 3 orçamentos por mês",
      "1 obra simultânea",
      "Link público com aceite digital",
      "PDF e link com marca Prumo",
      "Etapas, diário, custos e visão financeira",
      "Cobrança de entrada e saldo por Pix",
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
      "Para operar sem limites e apresentar sua própria marca ao cliente.",
    cta: "Assinar Pro",
    features: [
      "Tudo do Grátis",
      "Orçamentos e obras ilimitadas",
      "PDF e link público sem marca Prumo",
      "Cobranças Pix e financeiro sem limite de obras",
      "Diário de obra com fotos sem limite de obras",
    ],
    checkoutHighlights: [
      "Orçamentos e obras ilimitadas",
      "PDF e link público sem marca Prumo",
      "Cobrança Pix e controle financeiro por obra",
    ],
  },
  ultimate: {
    key: "ultimate",
    name: "Ultimate",
    label: "Plano Ultimate",
    priceCents: 24700,
    priceLabel: "R$ 247",
    description:
      "Para operações que precisam cadastrar itens em lote e fechar números fora do Prumo.",
    cta: "Assinar Ultimate",
    features: [
      "Tudo do Pro",
      "Consulta SINAPI oficial por UF no editor de orçamento",
      "Importação de catálogo por CSV",
      "Até 500 itens por importação",
      "Exportação CSV de receitas recebidas e custos",
      "Catálogo manual e importado no mesmo fluxo",
    ],
    checkoutHighlights: [
      "Tudo do Pro incluído",
      "Consulta SINAPI oficial por UF",
      "Importação de catálogo por CSV",
      "Até 500 itens por arquivo",
      "Exportação CSV de receitas e custos",
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

export function shouldShowPrumoBrand(plan: string | null | undefined) {
  return normalizeAppPlan(plan) === "free";
}

export function getFreeQuoteQuotaMonthStart(
  now = new Date(),
  timeZone = "America/Sao_Paulo",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString();
  }

  return new Date(`${year}-${month}-01T03:00:00.000Z`).toISOString();
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

export function companyIdFromSaasSubscriptionReference(
  reference: string | null | undefined,
): string | null {
  const trimmed = reference?.trim();
  if (!trimmed) return null;

  const match = /^SUB_(?:PRO|ULTIMATE)_(.+)$/i.exec(trimmed);
  return match?.[1] ?? null;
}
