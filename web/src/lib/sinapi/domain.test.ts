import { describe, expect, it } from "vitest";
import {
  applySinapiAdjustment,
  normalizeSinapiCode,
  normalizeSinapiCompetence,
  normalizeSinapiDescription,
  normalizeSinapiSearchText,
  normalizeSinapiUnit,
  parseSinapiFractionToBasisPoints,
  parseSinapiMoneyToCents,
} from "./domain";

describe("SINAPI domain", () => {
  it.each([
    ["06/2026", "2026-06-01"],
    ["2026-06", "2026-06-01"],
    ["2026-06-01", "2026-06-01"],
  ])("normalizes competence %s", (input, expected) => {
    expect(normalizeSinapiCompetence(input)).toBe(expected);
  });

  it.each(["13/2026", "2026-02-02", "1999-12", "", null])(
    "rejects invalid competence %s",
    (input) => expect(normalizeSinapiCompetence(input)).toBeNull(),
  );

  it("normalizes official identifiers without discarding text zeros", () => {
    expect(normalizeSinapiCode(12345)).toBe("12345");
    expect(normalizeSinapiCode(" 00123-a ")).toBe("00123-A");
    expect(normalizeSinapiCode("0000")).toBeNull();
    expect(normalizeSinapiCode(0)).toBeNull();
  });

  it("normalizes descriptions, units and searchable text", () => {
    expect(normalizeSinapiDescription("  Piso   podotatil  ")).toBe(
      "Piso podotatil",
    );
    expect(normalizeSinapiUnit(" m2 ")).toBe("M2");
    expect(normalizeSinapiSearchText("PISO PODOTATIL - execucao")).toBe(
      "piso podotatil execucao",
    );
    expect(normalizeSinapiDescription("x".repeat(501))).toBeNull();
  });

  it.each([
    [1234.56, 123456],
    ["1.234,56", 123456],
    ["R$ 0,05", 5],
    ["12", 1200],
    [0, 0],
  ])("converts monetary value %s to exact cents", (input, expected) => {
    expect(parseSinapiMoneyToCents(input)).toBe(expected);
  });

  it.each([-1, "-1,00", "1.234", "1,234", Number.NaN, null])(
    "rejects invalid monetary value %s",
    (input) => expect(parseSinapiMoneyToCents(input)).toBeNull(),
  );

  it("converts fractions and percentages to basis points", () => {
    expect(parseSinapiFractionToBasisPoints(0.0392)).toBe(392);
    expect(parseSinapiFractionToBasisPoints("3,92%")).toBe(392);
    expect(parseSinapiFractionToBasisPoints(1)).toBe(10_000);
    expect(parseSinapiFractionToBasisPoints(1.1)).toBeNull();
  });

  it("applies adjustment with deterministic half-up rounding", () => {
    expect(applySinapiAdjustment(10_000, 2_500)).toBe(12_500);
    expect(applySinapiAdjustment(101, 500)).toBe(106);
    expect(applySinapiAdjustment(100, -1)).toBeNull();
    expect(applySinapiAdjustment(100, 100_001)).toBeNull();
  });
});
