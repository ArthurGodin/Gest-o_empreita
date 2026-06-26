import { describe, expect, it } from "vitest";
import {
  CATALOG_IMPORT_MAX_ROWS,
  parseCatalogCsv,
} from "@/lib/catalog-import";

describe("catalog import parser", () => {
  it("parses the Portuguese semicolon template", () => {
    const result = parseCatalogCsv(
      "descricao;unidade;preco\nTelha ceramica;un;8,50\nManta asfaltica;m2;32,90",
    );

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        description: "Telha ceramica",
        unit: "un",
        default_price_cents: 850,
        sourceRow: 2,
      },
      {
        description: "Manta asfaltica",
        unit: "m2",
        default_price_cents: 3290,
        sourceRow: 3,
      },
    ]);
  });

  it("supports quoted delimiters and BRL values", () => {
    const result = parseCatalogCsv(
      'descrição;unidade;preço\n"Pedreiro; acabamento";h;"R$ 45,00"',
    );

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      description: "Pedreiro; acabamento",
      unit: "h",
      default_price_cents: 4500,
    });
  });

  it("reports invalid rows without discarding valid rows", () => {
    const result = parseCatalogCsv(
      "descricao;unidade;preco\nA;un;8,00\nTelha;un;abc\nManta;m2;32,90",
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].description).toBe("Manta");
    expect(result.errors).toEqual([
      {
        row: 2,
        message: "Descrição precisa ter pelo menos 2 caracteres.",
      },
      {
        row: 3,
        message: "Preço inválido. Use valores como 8,50 ou R$ 8,50.",
      },
    ]);
  });

  it("rejects files without required headers", () => {
    const result = parseCatalogCsv("item;unidade\nTelha;un");

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toMatchObject({
      row: 1,
      message: "Cabeçalho obrigatório ausente: preco.",
    });
  });

  it("caps the amount of imported rows", () => {
    const csv = [
      "descricao;unidade;preco",
      ...Array.from(
        { length: CATALOG_IMPORT_MAX_ROWS + 1 },
        (_, index) => `Item ${index};un;1,00`,
      ),
    ].join("\n");

    const result = parseCatalogCsv(csv);

    expect(result.rows).toHaveLength(CATALOG_IMPORT_MAX_ROWS);
    expect(result.errors.at(-1)?.message).toBe(
      `Limite de ${CATALOG_IMPORT_MAX_ROWS} itens por importação atingido.`,
    );
  });
});
