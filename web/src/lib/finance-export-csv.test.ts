import { describe, expect, it } from "vitest";
import type { BusinessSegment } from "./business-segment";
import { buildFinanceExportCsv, UTF8_CSV_BOM } from "./finance-export-csv";

describe("finance export CSV", () => {
  it("gera CSV UTF-8 amigavel para planilhas mobile", () => {
    const csv = buildFinanceExportCsv({
      charges: [
        {
          paid_at: "2026-07-21T12:00:00.000Z",
          created_at: "2026-07-20T12:00:00.000Z",
          kind: "entrada",
          amount_cents: 1070000,
          project: { name: "Demo - Execução" },
        },
      ],
      costs: [
        {
          incurred_on: "2026-07-22",
          description: 'Telhas "cerâmica" material',
          category: "material",
          amount_cents: 35000,
          project: { name: "Demo - Execução" },
        },
      ],
    });

    expect(csv.startsWith(UTF8_CSV_BOM)).toBe(true);
    expect(Buffer.from(csv, "utf8").subarray(0, 3)).toEqual(
      Buffer.from([0xef, 0xbb, 0xbf]),
    );
    expect(csv).toContain("Data;Tipo;Obra;Descrição;Categoria;Valor");
    expect(csv).toContain('"Demo - Execução"');
    expect(csv).toContain('"Telhas ""cerâmica"" material"');
    expect(csv).toContain('"Material"');
    expect(csv).toContain('"-350,00"');
  });

  it.each<{
    segment: BusinessSegment;
    projectLabel: "Projeto" | "Obra";
    chargeDescription: string;
  }>([
    {
      segment: "architecture",
      projectLabel: "Projeto",
      chargeDescription: "Entrada do projeto",
    },
    {
      segment: "interiors",
      projectLabel: "Projeto",
      chargeDescription: "Entrada do projeto",
    },
    {
      segment: "engineering",
      projectLabel: "Projeto",
      chargeDescription: "Entrada do projeto",
    },
    {
      segment: "construction",
      projectLabel: "Obra",
      chargeDescription: "Entrada da obra",
    },
  ])(
    "uses $projectLabel vocabulary for $segment",
    ({ segment, projectLabel, chargeDescription }) => {
      const csv = buildFinanceExportCsv({
        businessSegment: segment,
        charges: [
          {
            paid_at: null,
            created_at: "2026-07-20T12:00:00.000Z",
            kind: "entrada",
            amount_cents: 10000,
            project: null,
          },
        ],
        costs: [],
      });

      expect(csv).toContain(`Data;Tipo;${projectLabel};Descrição`);
      expect(csv).toContain(`"${chargeDescription}"`);
      expect(csv).toContain(`"Sem ${projectLabel.toLocaleLowerCase("pt-BR")}"`);
    },
  );

  it("maps every internal cost category to its public label", () => {
    const csv = buildFinanceExportCsv({
      businessSegment: "architecture",
      charges: [],
      costs: [
        {
          incurred_on: "2026-07-22",
          description: "A",
          category: "material",
          amount_cents: 100,
          project: null,
        },
        {
          incurred_on: "2026-07-22",
          description: "B",
          category: "labor",
          amount_cents: 100,
          project: null,
        },
        {
          incurred_on: "2026-07-22",
          description: "C",
          category: "freight",
          amount_cents: 100,
          project: null,
        },
        {
          incurred_on: "2026-07-22",
          description: "D",
          category: "other",
          amount_cents: 100,
          project: null,
        },
      ],
    });

    for (const label of ["Material", "Mão de obra", "Frete", "Outros"]) {
      expect(csv).toContain(`"${label}"`);
    }
  });
});
