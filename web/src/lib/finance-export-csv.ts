import {
  getBusinessVocabulary,
  type BusinessSegment,
} from "@/lib/business-segment";
import type { ChargeKind, CostCategory } from "@/lib/supabase/types";
import { formatDateBR } from "@/lib/utils";

export const UTF8_CSV_BOM = "\uFEFF";

const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  material: "Material",
  labor: "Mão de obra",
  freight: "Frete",
  other: "Outros",
};

const CHARGE_DESCRIPTION: Record<ChargeKind, string> = {
  entrada: "Entrada",
  saldo: "Saldo",
};

export interface FinanceExportProject {
  name: string | null;
}

export interface FinanceExportCharge {
  paid_at: string | null;
  created_at: string;
  kind: ChargeKind;
  amount_cents: number;
  project: FinanceExportProject | FinanceExportProject[] | null;
}

export interface FinanceExportCost {
  incurred_on: string;
  description: string;
  category: CostCategory;
  amount_cents: number;
  project: FinanceExportProject | FinanceExportProject[] | null;
}

export function buildFinanceExportCsv({
  charges,
  costs,
  businessSegment,
}: {
  charges: FinanceExportCharge[];
  costs: FinanceExportCost[];
  businessSegment?: BusinessSegment;
}) {
  const vocabulary = getBusinessVocabulary(businessSegment);
  const projectLabel = vocabulary.projectSingular;
  const projectLabelLower = projectLabel.toLocaleLowerCase("pt-BR");
  const projectArticle = projectLabelLower === "obra" ? "da" : "do";
  let csv =
    `${UTF8_CSV_BOM}Data;Tipo;${projectLabel};` +
    "Descrição;Categoria;Valor\n";

  charges.forEach((charge) => {
    const date = charge.paid_at || charge.created_at;
    const projectName = projectNameFromRelation(charge.project, projectLabel);
    const value = (charge.amount_cents / 100).toFixed(2).replace(".", ",");
    const description =
      `${CHARGE_DESCRIPTION[charge.kind]} ${projectArticle} ` +
      projectLabelLower;

    csv += csvRow([
      formatDateBR(date),
      "RECEITA",
      projectName,
      description,
      "-",
      value,
    ]);
  });

  costs.forEach((cost) => {
    const projectName = projectNameFromRelation(cost.project, projectLabel);
    const value = (cost.amount_cents / 100).toFixed(2).replace(".", ",");

    csv += csvRow([
      formatDateBR(cost.incurred_on),
      "CUSTO",
      projectName,
      cost.description,
      COST_CATEGORY_LABEL[cost.category],
      `-${value}`,
    ]);
  });

  return csv;
}

function projectNameFromRelation(
  project: FinanceExportProject | FinanceExportProject[] | null,
  projectLabel: string,
) {
  const value = Array.isArray(project) ? project[0] : project;
  return value?.name || `Sem ${projectLabel.toLocaleLowerCase("pt-BR")}`;
}

function csvRow(values: string[]) {
  return `${values.map(csvCell).join(";")}\n`;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
