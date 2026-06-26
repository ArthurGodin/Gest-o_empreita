"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { formatDateBR } from "@/lib/utils";

interface FinanceExportProject {
  name: string | null;
}

interface FinanceExportCharge {
  paid_at: string | null;
  created_at: string;
  description: string | null;
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
  if (!user) return { ok: false, error: "Sessão expirada." };
  
  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();
  
  // ─── Paywall: Exclusivo Ultimate ───────────────────────────────────────────
  const { data: companyData } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", company.company_id)
    .single();

  if (companyData?.plan !== "ultimate") {
     return { 
       ok: false, 
       error: "A Exportação Contábil é uma funcionalidade exclusiva do plano Ultimate. Assine o Ultimate para enviar o relatório para o seu contador." 
     };
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Buscar Receitas (Cobranças pagas)
  const { data: charges } = await supabase
    .from("charges")
    .select("paid_at, created_at, description, amount_cents, project:projects(name)")
    .eq("company_id", company.company_id)
    .in("status", ["received", "confirmed"]);
    
  // Buscar Despesas (Custos de obras)
  const { data: costs } = await supabase
    .from("project_costs")
    .select("incurred_on, description, category, amount_cents, project:projects(name)")
    .eq("company_id", company.company_id);

  // Usamos ponto e vírgula para compatibilidade nativa com Excel no Brasil
  let csv = "Data;Tipo;Obra;Descricao;Categoria;Valor\n";
  
  if (charges) {
    (charges as unknown as FinanceExportCharge[]).forEach(c => {
       const date = c.paid_at || c.created_at;
       const projectName = projectNameFromRelation(c.project);
       const val = (c.amount_cents / 100).toFixed(2).replace(".", ",");
       csv += `"${formatDateBR(date)}";"RECEITA";"${projectName}";"${c.description || 'Cobrança'}";"-";"${val}"\n`;
    });
  }
  
  if (costs) {
    (costs as unknown as FinanceExportCost[]).forEach(c => {
       const projectName = projectNameFromRelation(c.project);
       const val = (c.amount_cents / 100).toFixed(2).replace(".", ",");
       csv += `"${formatDateBR(c.incurred_on)}";"CUSTO";"${projectName}";"${c.description}";"${c.category}";"-${val}"\n`;
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
