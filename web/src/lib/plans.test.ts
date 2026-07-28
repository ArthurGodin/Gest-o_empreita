import { describe, expect, it } from "vitest";
import {
  FREE_ACTIVE_PROJECT_LIMIT,
  FREE_MONTHLY_QUOTE_LIMIT,
  companyIdFromSaasSubscriptionReference,
  getFreeQuoteQuotaMonthStart,
  isPlanAtLeast,
  makeSaasSubscriptionReference,
  normalizeAppPlan,
  normalizePaidPlan,
  paidPlanFromSaasSubscriptionReference,
  PLAN_DEFINITIONS,
  shouldShowPrumoBrand,
} from "@/lib/plans";
import { getArchitecturePlanLimits } from "@/lib/architecture-plan-limits";
import {
  formatStorageBytes,
  getDeliverablePlanLimits,
} from "@/lib/deliverables";
import { CATALOG_IMPORT_MAX_ROWS } from "@/lib/catalog-import";

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

  it("keeps architecture promises aligned with enforced plan limits", () => {
    for (const plan of ["free", "pro", "ultimate"] as const) {
      const limits = getArchitecturePlanLimits(plan);
      const architectureFeature = PLAN_DEFINITIONS[plan].features.find(
        (feature) => feature.includes("ambiente"),
      );

      expect(architectureFeature).toContain(
        String(limits.activeBriefingsPerCompany),
      );
      expect(architectureFeature).toContain(
        String(limits.activeSpacesPerProject),
      );
    }

    expect(PLAN_DEFINITIONS.pro.description).not.toContain("sem limites");
  });

  it("keeps free commercial limits aligned with enforcement constants", () => {
    expect(PLAN_DEFINITIONS.free.features).toContain(
      `Até ${FREE_MONTHLY_QUOTE_LIMIT} propostas ou orçamentos por mês`,
    );
    expect(PLAN_DEFINITIONS.free.features).toContain(
      `${FREE_ACTIVE_PROJECT_LIMIT} projeto ou obra simultânea`,
    );
  });

  it("keeps deliverable promises aligned with enforced plan limits", () => {
    for (const plan of ["free", "pro", "ultimate"] as const) {
      const limits = getDeliverablePlanLimits(plan);
      const deliverableFeature = PLAN_DEFINITIONS[plan].features.find(
        (feature) => feature.includes("entregas ativas"),
      );

      expect(deliverableFeature).toContain(String(limits.activePerProject));
      expect(deliverableFeature).toContain(
        formatStorageBytes(limits.storageBytes),
      );
    }
  });

  it("keeps Ultimate import and data promises explicit", () => {
    const ultimateFeatures = PLAN_DEFINITIONS.ultimate.features;

    expect(ultimateFeatures).toContain(
      `Até ${CATALOG_IMPORT_MAX_ROWS} itens por importação`,
    );
    expect(ultimateFeatures).toContain(
      "Consulta SINAPI oficial por UF para orçamentos de execução",
    );
    expect(ultimateFeatures).toContain(
      "Exportação CSV de receitas recebidas e custos",
    );
    expect(ultimateFeatures.join(" ")).not.toMatch(/em breve/i);
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
