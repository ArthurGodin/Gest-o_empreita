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
  sendMetaConversionsEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({
    cookie: "prumo_marketing_consent=v1.granted",
  })),
}));
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
vi.mock("@/lib/meta-conversions", () => ({
  sendMetaConversionsEvent: mocks.sendMetaConversionsEvent,
}));
vi.mock("@/lib/meta-events", () => ({
  createProductEventId: () =>
    "saas_checkout_generated-server-occurrence-123",
}));
vi.mock("@/lib/queries/company", () => ({
  getActiveCompany: mocks.getActiveCompany,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

function activeCompany(
  role: "owner" | "admin" | "worker",
  workspaceMode: "live" | "demo" = "live",
) {
  return {
    company_id: "company-id",
    role,
    company: {
      id: "company-id",
      name: "Empresa QA",
      logo_url: null,
      workspace_mode: workspaceMode,
    },
  };
}

describe("SaaS plan actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-id" });
    mocks.sendMetaConversionsEvent.mockResolvedValue({ sent: true });
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
      eventId: "saas_checkout_generated-server-occurrence-123",
    });
    expect(mocks.createSaasSubscriptionCheckout).toHaveBeenCalledWith({
      plan: "ultimate",
      companyId: "company-id",
      companyName: "Empresa QA",
    });
    expect(mocks.sendMetaConversionsEvent).toHaveBeenCalledWith({
      name: "saas_checkout_generated",
      properties: {
        plan: "ultimate",
        reused: false,
        simulated: false,
      },
      eventId: "saas_checkout_generated-server-occurrence-123",
      path: "/app/configuracoes/plano/checkout?plan=ultimate",
      requestHeaders: expect.any(Headers),
      externalId: "user-id",
    });
  });

  it("reuses a pending checkout without counting another conversion", async () => {
    mocks.getActiveCompany.mockResolvedValue(activeCompany("owner"));
    mocks.createSaasSubscriptionCheckout.mockResolvedValue({
      checkoutUrl: "https://asaas.test/existing",
      reused: true,
    });

    await expect(checkoutPlanAction("pro")).resolves.toEqual({
      ok: true,
      checkoutUrl: "https://asaas.test/existing",
      simulated: false,
      reused: true,
      eventId: undefined,
    });
    expect(mocks.sendMetaConversionsEvent).not.toHaveBeenCalled();
  });

  it("blocks checkout creation in demo workspaces", async () => {
    mocks.getActiveCompany.mockResolvedValue(activeCompany("owner", "demo"));

    await expect(checkoutPlanAction("ultimate")).resolves.toEqual({
      ok: false,
      error: "Pagamentos reais ficam bloqueados no ambiente de demonstração.",
    });
    expect(mocks.createSaasSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it("blocks cancellation for members who are not owners", async () => {
    mocks.getActiveCompany.mockResolvedValue(activeCompany("worker"));

    await expect(cancelCurrentPlanAction()).resolves.toEqual({
      ok: false,
      error: "Somente o proprietario da empresa pode cancelar a assinatura.",
    });
    expect(mocks.cancelCompanySaasPlan).not.toHaveBeenCalled();
  });

  it("blocks plan cancellation in demo workspaces", async () => {
    mocks.getActiveCompany.mockResolvedValue(activeCompany("owner", "demo"));

    await expect(cancelCurrentPlanAction()).resolves.toEqual({
      ok: false,
      error: "Pagamentos reais ficam bloqueados no ambiente de demonstração.",
    });
    expect(mocks.cancelCompanySaasPlan).not.toHaveBeenCalled();
  });
});
