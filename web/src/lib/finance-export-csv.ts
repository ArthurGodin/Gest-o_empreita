import { formatDateBR } from "@/lib/utils";

export const UTF8_CSV_BOM = "\uFEFF";

export interface FinanceExportProject {
  name: string | null;
}

export interface FinanceExportCharge {
  paid_at: string | null;
  created_at: string;
  kind: string;
  amount_cents: number;
  project: FinanceExportProject | FinanceExportProject[] | null;
}

export interface FinanceExportCost {
  incurred_on: string;
  description: string;
  category: string;
  amount_cents: number;
  project: FinanceExportProject | FinanceExportProject[] | null;
}

export function buildFinanceExportCsv({
  charges,
  costs,
}: {
  charges: FinanceExportCharge[];
  costs: FinanceExportCost[];
}) {
  let csv = `${UTF8_CSV_BOM}Data;Tipo;Obra;Descrição;Categoria;Valor\n`;

  charges.forEach((charge) => {
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

  costs.forEach((cost) => {
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

  return csv;
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
