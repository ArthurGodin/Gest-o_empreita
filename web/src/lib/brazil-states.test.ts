import { describe, expect, it } from "vitest";
import {
  BRAZIL_STATE_CODES,
  isBrazilStateCode,
  normalizeBrazilStateCode,
} from "./brazil-states";

describe("Brazil state codes", () => {
  it("contains the 27 unique Brazilian state codes", () => {
    expect(BRAZIL_STATE_CODES).toHaveLength(27);
    expect(new Set(BRAZIL_STATE_CODES).size).toBe(27);
  });

  it("normalizes valid codes case-insensitively", () => {
    expect(normalizeBrazilStateCode(" pi ")).toBe("PI");
    expect(isBrazilStateCode("sp")).toBe(true);
  });

  it.each(["XX", "P", "PIA", "", null, undefined])(
    "rejects invalid code %s",
    (value) => {
      expect(normalizeBrazilStateCode(value)).toBeNull();
      expect(isBrazilStateCode(value)).toBe(false);
    },
  );
});
