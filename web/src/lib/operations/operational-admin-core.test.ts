import { describe, expect, it } from "vitest";
import {
  isOperationalAdminEmail,
  parseOperationalAdminEmails,
} from "./operational-admin-core";

describe("operational admin access", () => {
  it("fails closed when the allowlist is absent or empty", () => {
    expect(isOperationalAdminEmail("owner@example.com", undefined)).toBe(false);
    expect(isOperationalAdminEmail("owner@example.com", "   ")).toBe(false);
    expect(isOperationalAdminEmail(undefined, "owner@example.com")).toBe(false);
  });

  it("normalizes case, whitespace and duplicate entries", () => {
    const configured =
      " Owner@Example.com,operacao@example.com, owner@example.com ";

    expect(parseOperationalAdminEmails(configured)).toEqual([
      "operacao@example.com",
      "owner@example.com",
    ]);
    expect(isOperationalAdminEmail(" OWNER@example.com ", configured)).toBe(true);
  });

  it("requires exact equality and rejects malformed entries", () => {
    const configured = "owner@example.com,invalido,sem-arroba.com";

    expect(isOperationalAdminEmail("owner@example.com.br", configured)).toBe(false);
    expect(isOperationalAdminEmail("other-owner@example.com", configured)).toBe(false);
    expect(parseOperationalAdminEmails(configured)).toEqual([
      "owner@example.com",
    ]);
  });
});
