import { describe, expect, it } from "vitest";
import {
  isPristineQuoteItem,
  quoteDraftSignature,
  toPersistedQuoteDraft,
  validateQuoteDraft,
  type ItemDraft,
  type QuoteDraft,
} from "./quote-draft";

function item(overrides: Partial<ItemDraft> = {}): ItemDraft {
  return {
    key: "item-1",
    catalog_item_id: null,
    description: "",
    unit: "un",
    quantity: 1,
    unit_price_cents: 0,
    ...overrides,
  };
}

function draft(overrides: Partial<QuoteDraft> = {}): QuoteDraft {
  return {
    title: "Cobertura residencial",
    description: "Escopo completo",
    customer_id: "customer-id",
    valid_until: "2026-08-01",
    notes: "Pagamento combinado",
    items: [item()],
    ...overrides,
  };
}

describe("quote draft model", () => {
  it("ignores a pristine helper row in the persisted payload", () => {
    expect(isPristineQuoteItem(item())).toBe(true);
    expect(toPersistedQuoteDraft(draft()).items).toEqual([]);
  });

  it("normalizes text and units before persisting", () => {
    const result = toPersistedQuoteDraft(
      draft({
        title: "  Reforma  ",
        description: "  Escopo  ",
        notes: "  Observacao  ",
        items: [
          item({
            description: "  Telha romana  ",
            unit: "  m2  ",
            quantity: 12.5,
            unit_price_cents: 8500,
          }),
        ],
      }),
    );

    expect(result).toEqual({
      title: "Reforma",
      description: "Escopo",
      customer_id: "customer-id",
      valid_until: "2026-08-01",
      notes: "Observacao",
      items: [
        {
          description: "Telha romana",
          unit: "m2",
          quantity: 12.5,
          unit_price_cents: 8500,
        },
      ],
    });
  });

  it("does not mark irrelevant surrounding spaces as dirty", () => {
    expect(
      quoteDraftSignature(draft({ title: " Cobertura residencial " })),
    ).toBe(quoteDraftSignature(draft()));
  });

  it("detects item reordering as a real change", () => {
    const first = item({
      key: "first",
      description: "Material",
      unit_price_cents: 100,
    });
    const second = item({
      key: "second",
      description: "Mao de obra",
      unit_price_cents: 200,
    });

    expect(
      quoteDraftSignature(draft({ items: [first, second] })),
    ).not.toBe(quoteDraftSignature(draft({ items: [second, first] })));
  });

  it("treats a partially edited row as persistible and invalid", () => {
    const partial = draft({ items: [item({ quantity: 2 })] });
    const validation = validateQuoteDraft(partial);

    expect(toPersistedQuoteDraft(partial).items).toHaveLength(1);
    expect(validation.items["item-1"]?.description).toMatch(/Descreva/);
    expect(validation.firstTarget).toEqual({
      kind: "item",
      key: "item-1",
      field: "description",
    });
  });

  it("allows a valid header-only draft", () => {
    expect(validateQuoteDraft(draft()).valid).toBe(true);
  });

  it("reports required header fields in visual order", () => {
    const validation = validateQuoteDraft(
      draft({ title: " ", customer_id: "" }),
    );

    expect(validation.fields.title).toBeTruthy();
    expect(validation.fields.customer_id).toBeTruthy();
    expect(validation.firstTarget).toEqual({
      kind: "field",
      field: "title",
    });
  });

  it("rejects text and numeric values outside server limits", () => {
    const validation = validateQuoteDraft(
      draft({
        title: "x".repeat(201),
        description: "x".repeat(5_001),
        notes: "x".repeat(5_001),
        items: [
          item({
            description: "x".repeat(501),
            unit: "long-unit-11",
            quantity: 1_000_001,
            unit_price_cents: 100_000_000_001,
          }),
        ],
      }),
    );

    expect(validation.valid).toBe(false);
    expect(validation.fields.title).toBeTruthy();
    expect(validation.fields.description).toBeTruthy();
    expect(validation.fields.notes).toBeTruthy();
    expect(validation.items["item-1"]).toMatchObject({
      description: expect.any(String),
      unit: expect.any(String),
      quantity: expect.any(String),
      unit_price_cents: expect.any(String),
    });
  });
});
