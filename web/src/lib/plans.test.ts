import { describe, expect, it } from "vitest";
import {
  isPlanAtLeast,
  makeSaasSubscriptionReference,
  normalizeAppPlan,
  normalizePaidPlan,
  paidPlanFromSaasSubscriptionReference,
} from "@/lib/plans";

describe("plan helpers", () => {
  it("normalizes unknown plans defensively", () => {
    expect(normalizeAppPlan("pro")).toBe("pro");
    expect(normalizeAppPlan("ultimate")).toBe("ultimate");
    expect(normalizeAppPlan("starter")).toBe("free");
    expect(normalizePaidPlan("free")).toBeNull();
  });

  it("checks plan hierarchy", () => {
    expect(isPlanAtLeast("ultimate", "pro")).toBe(true);
    expect(isPlanAtLeast("pro", "ultimate")).toBe(false);
    expect(isPlanAtLeast("free", "free")).toBe(true);
  });

  it("maps Asaas SaaS subscription references back to the paid plan", () => {
    const proReference = makeSaasSubscriptionReference("pro", "company-id");
    const ultimateReference = makeSaasSubscriptionReference(
      "ultimate",
      "company-id",
    );

    expect(proReference).toBe("SUB_PRO_company-id");
    expect(ultimateReference).toBe("SUB_ULTIMATE_company-id");
    expect(paidPlanFromSaasSubscriptionReference(proReference)).toBe("pro");
    expect(paidPlanFromSaasSubscriptionReference(ultimateReference)).toBe(
      "ultimate",
    );
    expect(paidPlanFromSaasSubscriptionReference("billing-charge-id")).toBeNull();
  });
});
