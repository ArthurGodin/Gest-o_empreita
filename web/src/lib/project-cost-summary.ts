import type { CostCategory } from "@/lib/supabase/types";

export interface CostSummary {
  by_category: Record<CostCategory, number>;
  total_cents: number;
  revenue_cents: number | null;
  margin_cents: number | null;
  margin_pct: number | null;
}

export interface ProjectCostSummaryInput {
  category: CostCategory;
  amount_cents: number;
}

export function summarizeProjectCosts(
  costs: ReadonlyArray<ProjectCostSummaryInput>,
  revenueCents: number | null,
): CostSummary {
  const byCategory: Record<CostCategory, number> = {
    material: 0,
    labor: 0,
    freight: 0,
    other: 0,
  };
  let total = 0;

  for (const cost of costs) {
    byCategory[cost.category] += cost.amount_cents;
    total += cost.amount_cents;
  }

  const margin = revenueCents == null ? null : revenueCents - total;
  const marginPct =
    revenueCents == null || revenueCents === 0
      ? null
      : Math.round((margin! / revenueCents) * 10000) / 100;

  return {
    by_category: byCategory,
    total_cents: total,
    revenue_cents: revenueCents,
    margin_cents: margin,
    margin_pct: marginPct,
  };
}
