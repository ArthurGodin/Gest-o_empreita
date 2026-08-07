import { describe, expect, it } from "vitest";
import {
  getPublicDemoScenario,
  listPublicDemoScenarios,
  normalizePublicDemoSection,
  normalizePublicDemoSegment,
  publicDemoFinancials,
  publicDemoQuoteTotal,
} from "./public-demo";

describe("public interactive demo scenarios", () => {
  it("defaults to architecture and overview", () => {
    expect(normalizePublicDemoSegment("unknown")).toBe("architecture");
    expect(normalizePublicDemoSection("unknown")).toBe("overview");
    expect(getPublicDemoScenario(undefined).segment).toBe("architecture");
  });

  it("provides four complete and financially consistent scenarios", () => {
    const scenarios = listPublicDemoScenarios();
    expect(scenarios).toHaveLength(4);

    for (const scenario of scenarios) {
      expect(scenario.quoteItems.length).toBeGreaterThanOrEqual(3);
      expect(scenario.stages.length).toBeGreaterThanOrEqual(4);
      expect(scenario.deliverables.length).toBeGreaterThanOrEqual(3);
      expect(scenario.costs.length).toBeGreaterThanOrEqual(3);
      expect(scenario.contextItems.length).toBeGreaterThanOrEqual(4);
      expect(scenario.projectProgress).toBeGreaterThanOrEqual(0);
      expect(scenario.projectProgress).toBeLessThanOrEqual(100);

      const total = publicDemoQuoteTotal(scenario);
      const finance = publicDemoFinancials(scenario);
      expect(total).toBeGreaterThan(0);
      expect(finance.contractedCents).toBe(total);
      expect(finance.balanceCents).toBe(total - scenario.receivedCents);
      expect(finance.marginCents).toBe(total - finance.costsCents);
      expect(finance.marginPercent).toBeGreaterThan(0);
      expect(finance.marginPercent).toBeLessThanOrEqual(100);
    }
  });

  it("contains no contact, document or payment identifiers", () => {
    const serialized = JSON.stringify(listPublicDemoScenarios());

    expect(serialized).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    expect(serialized).not.toMatch(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/);
    expect(serialized).not.toMatch(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
    expect(serialized).not.toMatch(/pix|asaas|checkout/i);
  });
});
