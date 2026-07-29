import { createClient } from "@/lib/supabase/server";
import {
  summarizeProjectCosts,
  type CostSummary,
} from "@/lib/project-cost-summary";
import type { ProjectCost } from "@/lib/queries/projects";

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

  const revenueCents = revenueRes.data?.total_cents ?? null;
  return summarizeProjectCosts(costsRes.data ?? [], revenueCents);
}
