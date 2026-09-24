import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/queries/company";
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
  recent_costs: Array<FinanceCost & { project_name: string | null }>;
}

export const getFinanceOverview = cache(async (): Promise<FinanceOverview> => {
  const activeCompany = await getActiveCompany();
  if (!activeCompany) throw new Error("Empresa ativa não encontrada");

  const { data, error } = await createClient().rpc("get_finance_overview", {
    p_company_id: activeCompany.company_id,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão para consultar o financeiro");
  return data as unknown as FinanceOverview;
});
