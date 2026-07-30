import { describe, expect, it } from "vitest";
import { buildCspReportOnly } from "./csp.mjs";

describe("CSP report-only", () => {
  it("allows only the browser origins required by the current product", () => {
    const policy = buildCspReportOnly();

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("https://*.supabase.co");
    expect(policy).toContain("wss://*.supabase.co");
    expect(policy).toContain("https://connect.facebook.net");
    expect(policy).toContain("https://va.vercel-scripts.com");
    expect(policy).not.toContain("api.asaas.com");
    expect(policy).not.toContain("api.resend.com");
  });

  it("keeps development-only eval and localhost sources out of production", () => {
    const production = buildCspReportOnly();
    const development = buildCspReportOnly({ development: true });

    expect(production).not.toContain("'unsafe-eval'");
    expect(production).not.toContain("localhost:*");
    expect(development).toContain("'unsafe-eval'");
    expect(development).toContain("http://localhost:*");
    expect(development).toContain("ws://localhost:*");
  });
});
