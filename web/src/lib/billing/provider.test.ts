import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireLiveCompanyWorkspace: vi.fn(),
  getCompanyPaymentSettings: vi.fn(),
  generateManualPixForCharge: vi.fn(),
  generatePixForCharge: vi.fn(),
}));

vi.mock("@/lib/workspace-mode-server", () => ({
  requireLiveCompanyWorkspace: mocks.requireLiveCompanyWorkspace,
}));

vi.mock("./manual-pix", () => ({
  getCompanyPaymentSettings: mocks.getCompanyPaymentSettings,
  isManualPixReady: vi.fn(),
  generateManualPixForCharge: mocks.generateManualPixForCharge,
}));

vi.mock("./asaas", () => ({
  generatePixForCharge: mocks.generatePixForCharge,
}));

import { generatePreferredPixForCharge } from "./provider";

const params = {
  chargeId: "charge-id",
  companyId: "company-id",
  customer: {
    id: "customer-id",
    name: "Cliente",
    document: null,
    email: null,
    phone: null,
  },
  description: "Entrada",
};

describe("preferred billing provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireLiveCompanyWorkspace.mockResolvedValue("live");
  });

  it("checks the workspace before reading payment settings", async () => {
    mocks.requireLiveCompanyWorkspace.mockRejectedValue(
      new Error("demo blocked"),
    );

    await expect(
      generatePreferredPixForCharge({} as never, params),
    ).rejects.toThrow("demo blocked");

    expect(mocks.getCompanyPaymentSettings).not.toHaveBeenCalled();
    expect(mocks.generateManualPixForCharge).not.toHaveBeenCalled();
    expect(mocks.generatePixForCharge).not.toHaveBeenCalled();
  });

  it("keeps manual Pix routing for live workspaces", async () => {
    mocks.getCompanyPaymentSettings.mockResolvedValue({
      payment_provider: "manual_pix",
    });
    mocks.generateManualPixForCharge.mockResolvedValue({
      ok: true,
      chargeId: "charge-id",
    });

    await expect(
      generatePreferredPixForCharge({} as never, params),
    ).resolves.toEqual({ ok: true, chargeId: "charge-id" });

    expect(mocks.requireLiveCompanyWorkspace).toHaveBeenCalledWith(
      {},
      "company-id",
      "generate_customer_pix",
    );
    expect(mocks.generateManualPixForCharge).toHaveBeenCalled();
    expect(mocks.generatePixForCharge).not.toHaveBeenCalled();
  });

  it("keeps Asaas routing for live workspaces", async () => {
    mocks.getCompanyPaymentSettings.mockResolvedValue({
      payment_provider: "asaas",
    });
    mocks.generatePixForCharge.mockResolvedValue({
      ok: true,
      chargeId: "charge-id",
    });

    await expect(
      generatePreferredPixForCharge({} as never, params),
    ).resolves.toEqual({ ok: true, chargeId: "charge-id" });

    expect(mocks.generatePixForCharge).toHaveBeenCalled();
    expect(mocks.generateManualPixForCharge).not.toHaveBeenCalled();
  });
});
