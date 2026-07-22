"use server";

import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import {
  buildFinanceExportCsv,
  type FinanceExportCharge,
  type FinanceExportCost,
} from "@/lib/finance-export-csv";

export async function exportFinanceDataAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessao expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa nao encontrada." };

  const supabase = createClient();

  const { data: companyData } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", company.company_id)
    .single();

  if (companyData?.plan !== "ultimate") {
    return {
      ok: false,
      error:
        "A Exportacao Contabil e exclusiva do plano Ultimate. Assine o Ultimate para enviar o relatorio ao contador.",
    };
  }

  const { data: charges } = await supabase
    .from("billing_charges")
    .select("paid_at, created_at, kind, amount_cents, project:projects(name)")
    .eq("company_id", company.company_id)
    .in("status", ["received", "confirmed"]);

  const { data: costs } = await supabase
    .from("project_costs")
    .select("incurred_on, description, category, amount_cents, project:projects(name)")
    .eq("company_id", company.company_id);

  const csv = buildFinanceExportCsv({
    charges: (charges ?? []) as unknown as FinanceExportCharge[],
    costs: (costs ?? []) as unknown as FinanceExportCost[],
  });

  return { ok: true, csv };
}
