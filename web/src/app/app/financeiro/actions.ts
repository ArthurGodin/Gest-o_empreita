"use server";

import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/utils";

interface FinanceExportProject {
  name: string | null;
}

interface FinanceExportCharge {
  paid_at: string | null;
  created_at: string;
  kind: string;
  amount_cents: number;
  project: FinanceExportProject | FinanceExportProject[] | null;
}

interface FinanceExportCost {
  incurred_on: string;
  description: string;
  category: string;
  amount_cents: number;
  project: FinanceExportProject | FinanceExportProject[] | null;
}

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

  let csv = "Data;Tipo;Obra;Descricao;Categoria;Valor\n";

  if (charges) {
    (charges as unknown as FinanceExportCharge[]).forEach((charge) => {
      const date = charge.paid_at || charge.created_at;
      const projectName = projectNameFromRelation(charge.project);
      const value = (charge.amount_cents / 100).toFixed(2).replace(".", ",");
      const description =
        charge.kind === "entrada" ? "Entrada da obra" : "Saldo da obra";

      csv += csvRow([
        formatDateBR(date),
        "RECEITA",
        projectName,
        description,
        "-",
        value,
      ]);
    });
  }

  if (costs) {
    (costs as unknown as FinanceExportCost[]).forEach((cost) => {
      const projectName = projectNameFromRelation(cost.project);
      const value = (cost.amount_cents / 100).toFixed(2).replace(".", ",");

      csv += csvRow([
        formatDateBR(cost.incurred_on),
        "CUSTO",
        projectName,
        cost.description,
        cost.category,
        `-${value}`,
      ]);
    });
  }

  return { ok: true, csv };
}

function projectNameFromRelation(
  project: FinanceExportProject | FinanceExportProject[] | null,
) {
  const value = Array.isArray(project) ? project[0] : project;
  return value?.name || "Sem Obra";
}

function csvRow(values: string[]) {
  return `${values.map(csvCell).join(";")}\n`;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
