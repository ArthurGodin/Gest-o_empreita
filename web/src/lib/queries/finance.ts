import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProjects, type ProjectListItem } from "@/lib/queries/projects";
import { getQuotes } from "@/lib/queries/quotes";
import type {
  ChargeKind,
  ChargeStatus,
  CostCategory,
  PaymentProvider,
  ProjectStatus,
} from "@/lib/supabase/types";

export interface FinanceCost {
  id: string;
  project_id: string;
  category: CostCategory;
  description: string;
  amount_cents: number;
  incurred_on: string;
  created_at: string;
}

export interface FinanceProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  customer_name: string | null;
  budget_cents: number | null;
  approved_revenue_cents: number;
  cost_cents: number;
  margin_cents: number | null;
  margin_pct: number | null;
  updated_at: string;
}

export interface FinanceChargeRow {
  id: string;
  project_id: string;
  project_name: string | null;
  customer_name: string | null;
  kind: ChargeKind;
  status: ChargeStatus;
  payment_provider: PaymentProvider;
  amount_cents: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface FinanceOverview {
  approved_revenue_cents: number;
  open_budget_cents: number;
  cost_cents: number;
  margin_cents: number;
  pending_quote_cents: number;
  approved_without_project_cents: number;
  received_charge_cents: number;
  pending_charge_cents: number;
  overdue_charge_cents: number;
  costs_by_category: Record<CostCategory, number>;
  project_rows: FinanceProjectRow[];
  charge_rows: FinanceChargeRow[];
  recent_costs: Array<
    FinanceCost & {
      project_name: string | null;
    }
  >;
}

const OPEN_STATUSES: ProjectStatus[] = ["planning", "in_progress", "paused"];

export const getFinanceOverview = cache(
  async (): Promise<FinanceOverview> => {
    const supabase = createClient();
    const [projects, quotes, costsRes, chargesRes] = await Promise.all([
      getProjects(),
      getQuotes(),
      supabase
        .from("project_costs")
        .select("id, project_id, category, description, amount_cents, incurred_on, created_at")
        .order("incurred_on", { ascending: false })
        .limit(500),
      supabase
        .from("billing_charges")
        .select(
          "id, project_id, kind, status, payment_provider, amount_cents, due_date, paid_at, created_at, project:projects(id, name), customer:customers(id, name)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (costsRes.error) throw costsRes.error;
    if (chargesRes.error) throw chargesRes.error;

    const costs = (costsRes.data ?? []) as FinanceCost[];
    const charges = (chargesRes.data ?? []) as unknown as Array<{
      id: string;
      project_id: string;
      kind: ChargeKind;
      status: ChargeStatus;
      payment_provider: PaymentProvider;
      amount_cents: number;
      due_date: string | null;
      paid_at: string | null;
      created_at: string;
      project: { id: string; name: string } | { id: string; name: string }[] | null;
      customer: { id: string; name: string } | { id: string; name: string }[] | null;
    }>;
    const costsByProject = new Map<string, number>();
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const approvedRevenueByProject = new Map<string, number>();

    const costsByCategory: Record<CostCategory, number> = {
      material: 0,
      labor: 0,
      freight: 0,
      other: 0,
    };

    for (const cost of costs) {
      costsByProject.set(
        cost.project_id,
        (costsByProject.get(cost.project_id) ?? 0) + cost.amount_cents,
      );
      costsByCategory[cost.category] += cost.amount_cents;
    }

    for (const quote of quotes) {
      if (quote.effective_status !== "approved" || !quote.project_id) continue;
      approvedRevenueByProject.set(
        quote.project_id,
        (approvedRevenueByProject.get(quote.project_id) ?? 0) + quote.total_cents,
      );
    }

    const approvedQuotes = quotes.filter(
      (quote) => quote.effective_status === "approved",
    );
    const pendingQuotes = quotes.filter(
      (quote) =>
        quote.effective_status === "sent" || quote.effective_status === "viewed",
    );

    const approvedRevenueCents = approvedQuotes.reduce(
      (sum, quote) => sum + quote.total_cents,
      0,
    );
    const pendingQuoteCents = pendingQuotes.reduce(
      (sum, quote) => sum + quote.total_cents,
      0,
    );
    const approvedWithoutProjectCents = approvedQuotes
      .filter((quote) => !quote.project_id)
      .reduce((sum, quote) => sum + quote.total_cents, 0);
    const costCents = costs.reduce((sum, cost) => sum + cost.amount_cents, 0);
    const openBudgetCents = projects
      .filter((project) => OPEN_STATUSES.includes(project.status))
      .reduce((sum, project) => sum + (project.budget_cents ?? 0), 0);
    const receivedChargeCents = charges
      .filter((charge) => charge.status === "received" || charge.status === "confirmed")
      .reduce((sum, charge) => sum + charge.amount_cents, 0);
    const pendingChargeCents = charges
      .filter((charge) => charge.status === "pending" || charge.status === "draft")
      .reduce((sum, charge) => sum + charge.amount_cents, 0);
    const overdueChargeCents = charges
      .filter((charge) => charge.status === "overdue")
      .reduce((sum, charge) => sum + charge.amount_cents, 0);

    return {
      approved_revenue_cents: approvedRevenueCents,
      open_budget_cents: openBudgetCents,
      cost_cents: costCents,
      margin_cents: approvedRevenueCents - costCents,
      pending_quote_cents: pendingQuoteCents,
      approved_without_project_cents: approvedWithoutProjectCents,
      received_charge_cents: receivedChargeCents,
      pending_charge_cents: pendingChargeCents,
      overdue_charge_cents: overdueChargeCents,
      costs_by_category: costsByCategory,
      project_rows: buildProjectRows(projects, costsByProject, approvedRevenueByProject),
      charge_rows: charges.map((charge) => {
        const project = Array.isArray(charge.project)
          ? charge.project[0]
          : charge.project;
        const customer = Array.isArray(charge.customer)
          ? charge.customer[0]
          : charge.customer;

        return {
          id: charge.id,
          project_id: charge.project_id,
          project_name: project?.name ?? null,
          customer_name: customer?.name ?? null,
          kind: charge.kind,
          status: charge.status,
          payment_provider: charge.payment_provider,
          amount_cents: charge.amount_cents,
          due_date: charge.due_date,
          paid_at: charge.paid_at,
          created_at: charge.created_at,
        };
      }),
      recent_costs: costs.slice(0, 8).map((cost) => ({
        ...cost,
        project_name: projectById.get(cost.project_id)?.name ?? null,
      })),
    };
  },
);

function buildProjectRows(
  projects: ProjectListItem[],
  costsByProject: Map<string, number>,
  approvedRevenueByProject: Map<string, number>,
): FinanceProjectRow[] {
  return projects
    .map((project) => {
      const costCents = costsByProject.get(project.id) ?? 0;
      const approvedRevenueCents = approvedRevenueByProject.get(project.id) ?? 0;
      const revenueBase = approvedRevenueCents || project.budget_cents || 0;
      const marginCents = revenueBase > 0 ? revenueBase - costCents : null;
      const marginPct =
        revenueBase > 0 && marginCents != null
          ? Math.round((marginCents / revenueBase) * 10000) / 100
          : null;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        customer_name: project.customer?.name ?? null,
        budget_cents: project.budget_cents,
        approved_revenue_cents: approvedRevenueCents,
        cost_cents: costCents,
        margin_cents: marginCents,
        margin_pct: marginPct,
        updated_at: project.updated_at,
      };
    })
    .filter(
      (row) =>
        row.approved_revenue_cents > 0 ||
        row.cost_cents > 0 ||
        row.budget_cents != null,
    )
    .sort((a, b) => {
      const aValue = a.approved_revenue_cents || a.budget_cents || 0;
      const bValue = b.approved_revenue_cents || b.budget_cents || 0;
      return bValue - aValue;
    })
    .slice(0, 10);
}
