import { describe, expect, it } from "vitest";
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
    expect(csv).toContain('"-350,00"');
  });
});
