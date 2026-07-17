import { describe, expect, it } from "vitest";

import { BRAZIL_STATE_CODES } from "../../src/lib/brazil-states";
import {
  parseSinapiWorkbookRows,
  type SinapiRow,
  type SinapiWorkbookLayout,
} from "./parser";

const TEST_LAYOUT: SinapiWorkbookLayout = {
  id: "test-layout",
  competence: {
    sheetName: "Menu",
    row: 0,
    column: 0,
  },
  sheets: [
    {
      sheetName: "ISD",
      kind: "input",
      regime: "sem_desoneracao",
      dataStartRow: 1,
      stateCodeRow: 0,
      codeColumn: 0,
      descriptionColumn: 1,
      unitColumn: 2,
      metadataColumn: 3,
      firstPriceColumn: 4,
      stateColumnStride: 1,
    },
    {
      sheetName: "CSD",
      kind: "composition",
      regime: "sem_desoneracao",
      dataStartRow: 1,
      stateCodeRow: 0,
      groupColumn: 0,
      codeColumn: 1,
      descriptionColumn: 2,
      unitColumn: 3,
      firstPriceColumn: 4,
      stateColumnStride: 2,
      stateMetadataOffset: 1,
    },
  ],
  analyticalSheet: {
    sheetName: "Anal\u00edtico",
    dataStartRow: 0,
    groupColumn: 0,
    compositionCodeColumn: 1,
    itemTypeColumn: 2,
    itemCodeColumn: 3,
    descriptionColumn: 4,
    unitColumn: 5,
    statusColumn: 7,
  },
};

describe("SINAPI parser", () => {
  it("parses inputs and resolves composition codes from the analytical sheet", () => {
    const result = parseSinapiWorkbookRows(
      {
        Menu: [["2026-06"]],
        ISD: [
          stateHeader(4, 1),
          withStateValues(["12345", "Concreto usinado", "m3", "CR"], 4, 1, {
            PI: 123.45,
          }),
        ],
        CSD: [
          stateHeader(4, 2),
          withStateValues(["Acessibilidade", 0, "Piso podotatil", "m2"], 4, 2, {
            PI: { price: 0, attribution: null },
            SP: { price: 99.9, attribution: 0.0392 },
          }),
        ],
        Analitico: [
          [
            "Acessibilidade",
            104658,
            null,
            null,
            "Piso podotatil",
            "m2",
            null,
            "COM CUSTO",
          ],
        ],
      },
      TEST_LAYOUT,
    );

    expect(result.competence).toBe("2026-06-01");
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      kind: "input",
      code: "12345",
      prices_cents: { PI: 12345 },
      price_metadata: { PI: { origin: "CR" } },
    });
    expect(result.entries[1]).toMatchObject({
      kind: "composition",
      code: "104658",
      prices_cents: { SP: 9990 },
      price_metadata: { SP: { attributed_sp_basis_points: 392 } },
    });
    expect(result.summary.omittedMissingCompositionPrices).toBe(1);
    expect(result.summary.coverageByState.PI).toBe(1);
  });

  it("rejects unexpected state columns", () => {
    const header = stateHeader(4, 1);
    header[4] = "XX";

    expect(() =>
      parseSinapiWorkbookRows(
        {
          Menu: [["2026-06"]],
          ISD: [header],
          CSD: [stateHeader(4, 2)],
          Analitico: [
            ["Estrutura", 104658, null, null, "Descricao oficial", "m2", null, "COM CUSTO"],
          ],
        },
        TEST_LAYOUT,
      ),
    ).toThrow("expected AC");
  });

  it("rejects composition rows that do not match the analytical crosswalk", () => {
    expect(() =>
      parseSinapiWorkbookRows(
        {
          Menu: [["2026-06"]],
          ISD: [stateHeader(4, 1)],
          CSD: [
            stateHeader(4, 2),
            withStateValues(["Estrutura", 0, "Descricao diferente", "m2"], 4, 2, {
              SP: { price: 99.9, attribution: 0 },
            }),
          ],
          Analitico: [
            ["Estrutura", 104658, null, null, "Descricao oficial", "m2", null, "COM CUSTO"],
          ],
        },
        TEST_LAYOUT,
      ),
    ).toThrow("does not match analytical composition");
  });
});

function stateHeader(firstPriceColumn: number, stride: number): SinapiRow {
  const row: SinapiRow = [];
  BRAZIL_STATE_CODES.forEach((state, index) => {
    row[firstPriceColumn + index * stride] = state;
  });
  return row;
}

function withStateValues(
  base: SinapiRow,
  firstPriceColumn: number,
  stride: number,
  values: Partial<Record<(typeof BRAZIL_STATE_CODES)[number], number | { price: number; attribution: number | null }>>,
): SinapiRow {
  const row = [...base];
  BRAZIL_STATE_CODES.forEach((state, index) => {
    const value = values[state];
    if (value === undefined) return;

    const priceColumn = firstPriceColumn + index * stride;
    if (typeof value === "number") {
      row[priceColumn] = value;
      return;
    }

    row[priceColumn] = value.price;
    row[priceColumn + 1] = value.attribution;
  });
  return row;
}
