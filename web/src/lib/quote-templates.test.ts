import { describe, expect, it } from "vitest";
import {
  getQuoteTemplate,
  getQuoteTemplatesForSegment,
  quoteTemplateItemsPayload,
  QUOTE_TEMPLATES,
} from "./quote-templates";

describe("quote templates", () => {
  it("offers three templates per supported segment", () => {
    for (const segment of [
      "architecture",
      "interiors",
      "engineering",
      "construction",
    ]) {
      expect(getQuoteTemplatesForSegment(segment)).toHaveLength(3);
    }
    expect(QUOTE_TEMPLATES).toHaveLength(12);
  });

  it("does not allow a template from another segment", () => {
    expect(
      getQuoteTemplate("architecture-residential", "construction"),
    ).toBeNull();
    expect(
      getQuoteTemplate("architecture-residential", "architecture")?.name,
    ).toBe("Projeto arquitetônico residencial");
  });

  it("never invents prices in generated items", () => {
    const template = getQuoteTemplate(
      "interiors-residential",
      "interiors",
    );
    expect(template).not.toBeNull();

    const items = quoteTemplateItemsPayload(template!);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.unit_price_cents === 0)).toBe(true);
    expect(items.every((item) => item.total_cents === 0)).toBe(true);
    expect(items.map((item) => item.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it("falls back unknown segments to construction templates", () => {
    expect(getQuoteTemplatesForSegment("unknown")[0]?.segment).toBe(
      "construction",
    );
  });
});
