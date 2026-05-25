import { createClient } from "@/lib/supabase/server";
import type { CostCategory } from "@/lib/supabase/types";
import type { CostSummary, ProjectCost } from "@/lib/queries/projects";

export async function listCosts(projectId: string): Promise<ProjectCost[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_costs")
    .select("*")
    .eq("project_id", projectId)
    .order("incurred_on", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProjectCost[];
}

/**
 * Resumo agregado por categoria + margem (receita do quote aprovado
 * desse projeto menos soma de custos). Retorna margem null se não
 * existir orçamento aprovado vinculado.
 */
export async function getCostSummary(projectId: string): Promise<CostSummary> {
  const supabase = createClient();

  const [costsRes, revenueRes] = await Promise.all([
    supabase
      .from("project_costs")
      .select("category,amount_cents")
      .eq("project_id", projectId),
    supabase
      .from("quotes")
      .select("total_cents")
      .eq("project_id", projectId)
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (costsRes.error) throw costsRes.error;
  if (revenueRes.error) throw revenueRes.error;

  const byCategory: Record<CostCategory, number> = {
    material: 0,
    labor: 0,
    freight: 0,
    other: 0,
  };
  let total = 0;
  for (const c of costsRes.data ?? []) {
    const row = c as { category: CostCategory; amount_cents: number };
    byCategory[row.category] += row.amount_cents;
    total += row.amount_cents;
  }

  const revenueCents = revenueRes.data?.total_cents ?? null;
  const marginCents = revenueCents == null ? null : revenueCents - total;
  const marginPct =
    revenueCents == null || revenueCents === 0
      ? null
      : Math.round(((revenueCents - total) / revenueCents) * 10000) / 100;

  return {
    by_category: byCategory,
    total_cents: total,
    revenue_cents: revenueCents,
    margin_cents: marginCents,
    margin_pct: marginPct,
  };
}
