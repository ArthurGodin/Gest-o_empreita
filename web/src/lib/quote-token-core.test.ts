import { describe, expect, it } from "vitest";
import {
  generateShareToken,
  isShareTokenUrlSafe,
  tokensMatch,
} from "./quote-token-core";

describe("quote token helpers", () => {
  it("generates URL-safe single-segment share tokens", () => {
    for (let i = 0; i < 100; i++) {
      const token = generateShareToken();
      expect(token).toHaveLength(43);
      expect(isShareTokenUrlSafe(token)).toBe(true);
      expect(token).not.toMatch(/[+/=]/);
    }
  });

  it("rejects legacy base64 tokens that break dynamic routes", () => {
    expect(isShareTokenUrlSafe("abc/defghijklmnopqrstuvwxyz1234567890")).toBe(
      false,
    );
    expect(isShareTokenUrlSafe("abc+defghijklmnopqrstuvwxyz1234567890")).toBe(
      false,
    );
  });

  it("compares tokens without early equality shortcuts", () => {
    expect(tokensMatch("a".repeat(43), "a".repeat(43))).toBe(true);
    expect(tokensMatch("a".repeat(43), `${"a".repeat(42)}b`)).toBe(false);
    expect(tokensMatch("a".repeat(43), "a".repeat(42))).toBe(false);
  });
});
