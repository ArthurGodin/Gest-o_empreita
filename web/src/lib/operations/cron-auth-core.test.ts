import { describe, expect, it } from "vitest";
import { timingSafeCronSecretMatches } from "./cron-auth-core";

const SECRET = "a".repeat(43);

describe("cron authorization", () => {
  it("accepts only the exact Bearer secret", () => {
    expect(timingSafeCronSecretMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(timingSafeCronSecretMatches(`Bearer ${SECRET}x`, SECRET)).toBe(false);
  });

  it("rejects missing, malformed and whitespace-bearing credentials", () => {
    expect(timingSafeCronSecretMatches(null, SECRET)).toBe(false);
    expect(timingSafeCronSecretMatches(SECRET, SECRET)).toBe(false);
    expect(timingSafeCronSecretMatches(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(timingSafeCronSecretMatches(`Bearer ${SECRET} `, SECRET)).toBe(false);
  });

  it("fails closed when the configured secret is absent or short", () => {
    expect(timingSafeCronSecretMatches(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(timingSafeCronSecretMatches("Bearer curto", "curto")).toBe(false);
  });
});
