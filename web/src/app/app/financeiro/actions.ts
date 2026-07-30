"use server";

import { normalizeBusinessSegment } from "@/lib/business-segment";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import {
  buildFinanceExportCsv,
  type FinanceExportCharge,
  type FinanceExportCost,
} from "@/lib/finance-export-csv";
import { logServerError } from "@/lib/log";

const EXPORT_ERROR =
  "Não foi possível gerar o relatório agora. Tente novamente.";

export async function exportFinanceDataAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessao expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa nao encontrada." };

  const supabase = createClient();

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("plan, business_segment")
    .eq("id", company.company_id)
    .single();

  if (companyError || !companyData) {
    logServerError(
      "finance.export.company",
      companyError ?? new Error("company_not_found"),
    );
    return { ok: false, error: EXPORT_ERROR };
  }

  if (companyData?.plan !== "ultimate") {
    return {
      ok: false,
      error:
        "A Exportacao Contabil e exclusiva do plano Ultimate. Assine o Ultimate para enviar o relatorio ao contador.",
    };
  }

  const [chargesResult, costsResult] = await Promise.all([
    supabase
      .from("billing_charges")
      .select("paid_at, created_at, kind, amount_cents, project:projects(name)")
      .eq("company_id", company.company_id)
      .in("status", ["received", "confirmed"]),
    supabase
      .from("project_costs")
      .select(
        "incurred_on, description, category, amount_cents, project:projects(name)",
      )
      .eq("company_id", company.company_id),
  ]);

  if (chargesResult.error || costsResult.error) {
    if (chargesResult.error) {
      logServerError("finance.export.charges", chargesResult.error);
    }
    if (costsResult.error) {
      logServerError("finance.export.costs", costsResult.error);
    }
    return { ok: false, error: EXPORT_ERROR };
  }

  const csv = buildFinanceExportCsv({
    charges: (chargesResult.data ?? []) as unknown as FinanceExportCharge[],
    costs: (costsResult.data ?? []) as unknown as FinanceExportCost[],
    businessSegment: normalizeBusinessSegment(companyData.business_segment),
  });

  return { ok: true, csv };
}
