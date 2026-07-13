import { describe, expect, it } from "vitest";
import {
  companyIdFromSaasSubscriptionReference,
  getFreeQuoteQuotaMonthStart,
  isPlanAtLeast,
  makeSaasSubscriptionReference,
  normalizeAppPlan,
  normalizePaidPlan,
  paidPlanFromSaasSubscriptionReference,
  shouldShowPrumoBrand,
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

  it("keeps Prumo branding only on the free plan", () => {
    expect(shouldShowPrumoBrand("free")).toBe(true);
    expect(shouldShowPrumoBrand(null)).toBe(true);
    expect(shouldShowPrumoBrand("pro")).toBe(false);
    expect(shouldShowPrumoBrand("ultimate")).toBe(false);
  });

  it("calculates the free quote monthly quota from Sao Paulo time", () => {
    expect(
      getFreeQuoteQuotaMonthStart(new Date("2026-07-10T12:00:00.000Z")),
    ).toBe("2026-07-01T03:00:00.000Z");
    expect(
      getFreeQuoteQuotaMonthStart(new Date("2026-08-01T02:30:00.000Z")),
    ).toBe("2026-07-01T03:00:00.000Z");
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

  it("extracts the company id from Asaas SaaS references", () => {
    expect(companyIdFromSaasSubscriptionReference("SUB_PRO_company-id")).toBe(
      "company-id",
    );
    expect(
      companyIdFromSaasSubscriptionReference("SUB_ULTIMATE_abc-123"),
    ).toBe("abc-123");
    expect(companyIdFromSaasSubscriptionReference("billing-charge-id")).toBeNull();
  });
});
