import { describe, expect, it } from "vitest";
import { timingSafeTokenMatches } from "./webhook-verify-core";

describe("Asaas webhook token verification", () => {
  it("accepts only the exact configured token", () => {
    const token = "a".repeat(32);

    expect(timingSafeTokenMatches(token, token)).toBe(true);
    expect(timingSafeTokenMatches(`${"a".repeat(31)}b`, token)).toBe(false);
  });

  it("rejects missing values and length mismatches", () => {
    expect(timingSafeTokenMatches(null, "a".repeat(32))).toBe(false);
    expect(timingSafeTokenMatches("a".repeat(32), undefined)).toBe(false);
    expect(timingSafeTokenMatches("a".repeat(31), "a".repeat(32))).toBe(
      false,
    );
  });
});
