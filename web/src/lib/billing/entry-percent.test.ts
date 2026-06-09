import { describe, expect, it } from "vitest";
import {
  calculateEntrySplit,
  entryPercentValidationMessage,
  isValidEntryPercent,
  parseEntryPercentInput,
} from "./entry-percent";

describe("entry percent helpers", () => {
  it("parses pt-BR decimal input", () => {
    expect(parseEntryPercentInput("30")).toBe(30);
    expect(parseEntryPercentInput("12,5")).toBe(12.5);
    expect(parseEntryPercentInput("")).toBeNull();
    expect(parseEntryPercentInput("abc")).toBeNull();
  });

  it("accepts only percentages between 0 and 100", () => {
    expect(isValidEntryPercent(0)).toBe(true);
    expect(isValidEntryPercent(100)).toBe(true);
    expect(isValidEntryPercent(-1)).toBe(false);
    expect(isValidEntryPercent(150)).toBe(false);
    expect(entryPercentValidationMessage(150)).toBe(
      "Entrada deve ficar entre 0% e 100%.",
    );
  });

  it("calculates entry and remaining balance without negative balance", () => {
    expect(calculateEntrySplit(45150, 30)).toEqual({
      entryCents: 13545,
      saldoCents: 31605,
    });
    expect(calculateEntrySplit(45150, 100)).toEqual({
      entryCents: 45150,
      saldoCents: 0,
    });
    expect(() => calculateEntrySplit(45150, 150)).toThrow(
      "Entrada deve ficar entre 0% e 100%.",
    );
  });
});
