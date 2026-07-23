import { describe, expect, it } from "vitest";
import {
  BUSINESS_SEGMENT_OPTIONS,
  getBusinessVocabulary,
  isBusinessSegment,
  normalizeBusinessSegment,
} from "./business-segment";

describe("business segment", () => {
  it("accepts only supported segment values", () => {
    expect(isBusinessSegment("architecture")).toBe(true);
    expect(isBusinessSegment("construction")).toBe(true);
    expect(isBusinessSegment("student")).toBe(false);
    expect(isBusinessSegment(null)).toBe(false);
  });

  it("keeps existing companies on the construction experience", () => {
    expect(normalizeBusinessSegment(undefined)).toBe("construction");
    expect(normalizeBusinessSegment("unknown")).toBe("construction");
    expect(getBusinessVocabulary(undefined).projectPlural).toBe("Obras");
  });

  it("uses proposal and project vocabulary for professional segments", () => {
    const vocabulary = getBusinessVocabulary("architecture");

    expect(vocabulary.quotePlural).toBe("Propostas");
    expect(vocabulary.projectPlural).toBe("Projetos");
    expect(vocabulary.createProjectLabel).toBe("Criar projeto");
  });

  it("exposes the four onboarding choices", () => {
    expect(BUSINESS_SEGMENT_OPTIONS.map((option) => option.value)).toEqual([
      "architecture",
      "interiors",
      "engineering",
      "construction",
    ]);
  });
});
