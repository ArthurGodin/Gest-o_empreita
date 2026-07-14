import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelCurrentPlanAction,
  checkoutPlanAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  cancelCompanySaasPlan: vi.fn(),
  createSaasSubscriptionCheckout: vi.fn(),
  getActiveCompany: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/alerts", () => ({ sendOperationalAlert: vi.fn() }));
vi.mock("@/lib/asaas/saas-billing", () => ({
  cancelCompanySaasPlan: mocks.cancelCompanySaasPlan,
  createSaasSubscriptionCheckout: mocks.createSaasSubscriptionCheckout,
  SaasCheckoutBlockedError: class SaasCheckoutBlockedError extends Error {
    code = "blocked";
    checkoutUrl = null;
  },
}));
vi.mock("@/lib/billing/saas-simulation", () => ({
  isSaasBillingSimulationEnabled: () => false,
}));
vi.mock("@/lib/log", () => ({
  logServerError: vi.fn(),
  logServerEvent: vi.fn(),
  logServerWarning: vi.fn(),
}));
vi.mock("@/lib/queries/company", () => ({
  getActiveCompany: mocks.getActiveCompany,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

function activeCompany(role: "owner" | "admin" | "worker") {
  return {
    company_id: "company-id",
    role,
    company: {
      id: "company-id",
      name: "Empresa QA",
      logo_url: null,
    },
  };
}

describe("SaaS plan actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-id" });
  });

  it("blocks checkout creation for members who are not owners", async () => {
    mocks.getActiveCompany.mockResolvedValue(activeCompany("admin"));

    await expect(checkoutPlanAction("pro")).resolves.toEqual({
      ok: false,
      error: "Somente o proprietario da empresa pode contratar um plano.",
    });
    expect(mocks.createSaasSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it("allows the owner to create a checkout", async () => {
    mocks.getActiveCompany.mockResolvedValue(activeCompany("owner"));
    mocks.createSaasSubscriptionCheckout.mockResolvedValue({
      checkoutUrl: "https://asaas.test/checkout",
      reused: false,
    });

    await expect(checkoutPlanAction("ultimate")).resolves.toEqual({
      ok: true,
      checkoutUrl: "https://asaas.test/checkout",
      simulated: false,
      reused: false,
    });
    expect(mocks.createSaasSubscriptionCheckout).toHaveBeenCalledWith({
      plan: "ultimate",
      companyId: "company-id",
      companyName: "Empresa QA",
    });
  });

  it("blocks cancellation for members who are not owners", async () => {
    mocks.getActiveCompany.mockResolvedValue(activeCompany("worker"));

    await expect(cancelCurrentPlanAction()).resolves.toEqual({
      ok: false,
      error: "Somente o proprietario da empresa pode cancelar a assinatura.",
    });
    expect(mocks.cancelCompanySaasPlan).not.toHaveBeenCalled();
  });
});
