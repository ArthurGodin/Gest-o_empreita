import { describe, expect, it } from "vitest";
import { shouldAllowSaasBillingSimulation } from "./saas-simulation-core";

describe("SaaS billing simulation guard", () => {
  it("allows simulation only outside production when Asaas is not configured", () => {
    expect(
      shouldAllowSaasBillingSimulation({
        asaasApiKey: undefined,
        nodeEnv: "development",
      }),
    ).toBe(true);

    expect(
      shouldAllowSaasBillingSimulation({
        asaasApiKey: "",
        nodeEnv: "test",
      }),
    ).toBe(true);
  });

  it("blocks simulation in production even when the Asaas key is missing", () => {
    expect(
      shouldAllowSaasBillingSimulation({
        asaasApiKey: undefined,
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("blocks simulation whenever real Asaas billing is configured", () => {
    expect(
      shouldAllowSaasBillingSimulation({
        asaasApiKey: "$aact_real_key",
        nodeEnv: "development",
      }),
    ).toBe(false);
  });
});
