import { describe, expect, it } from "vitest";
import { summarizeProjectCosts } from "./project-cost-summary";

describe("summarizeProjectCosts", () => {
  it("aggregates categories and calculates margin without float leakage", () => {
    expect(
      summarizeProjectCosts(
        [
          { category: "material", amount_cents: 20_000 },
          { category: "material", amount_cents: 5_000 },
          { category: "labor", amount_cents: 15_000 },
        ],
        100_000,
      ),
    ).toEqual({
      by_category: {
        material: 25_000,
        labor: 15_000,
        freight: 0,
        other: 0,
      },
      total_cents: 40_000,
      revenue_cents: 100_000,
      margin_cents: 60_000,
      margin_pct: 60,
    });
  });

  it("keeps margin unknown without approved revenue", () => {
    expect(
      summarizeProjectCosts(
        [{ category: "other", amount_cents: 9_000 }],
        null,
      ),
    ).toMatchObject({
      total_cents: 9_000,
      revenue_cents: null,
      margin_cents: null,
      margin_pct: null,
    });
  });

  it("does not divide by zero", () => {
    expect(summarizeProjectCosts([], 0)).toMatchObject({
      revenue_cents: 0,
      margin_cents: 0,
      margin_pct: null,
    });
  });
});
