import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateActivationGoalAction } from "./activation-actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getActiveCompany: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  logServerError: vi.fn(),
  logServerEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/queries/company", () => ({
  getActiveCompany: mocks.getActiveCompany,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/log", () => ({
  clientErrorFor: () => "Erro seguro.",
  logServerError: mocks.logServerError,
  logServerEvent: mocks.logServerEvent,
}));

function membership(role = "owner", segment = "architecture") {
  return {
    company_id: "11111111-1111-4111-8111-111111111111",
    role,
    company: {
      business_segment: segment,
      activation_goal: "sell",
    },
  };
}

function updateClient(error: unknown = null) {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
  };
  query.update.mockReturnValue(query);
  query.eq.mockResolvedValue({ error });
  return {
    query,
    client: { from: vi.fn(() => query) },
  };
}

describe("updateActivationGoalAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-id" });
    mocks.getActiveCompany.mockResolvedValue(membership());
  });

  it("updates an allowed objective and revalidates the dashboard", async () => {
    const { client, query } = updateClient();
    mocks.createClient.mockReturnValue(client);

    await expect(
      updateActivationGoalAction({ goal: "client_briefing" }),
    ).resolves.toEqual({ ok: true });

    expect(query.update).toHaveBeenCalledWith({
      activation_goal: "client_briefing",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app");
  });

  it("rejects objectives incompatible with the company segment", async () => {
    mocks.getActiveCompany.mockResolvedValue(
      membership("owner", "construction"),
    );

    await expect(
      updateActivationGoalAction({ goal: "client_briefing" }),
    ).resolves.toEqual({
      ok: false,
      error: "Esse objetivo não está disponível para sua área profissional.",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each(["foreman", "worker"])(
    "does not let a %s change the shared company objective",
    async (role) => {
      mocks.getActiveCompany.mockResolvedValue(membership(role));

      const result = await updateActivationGoalAction({
        goal: "client_briefing",
      });

      expect(result.ok).toBe(false);
      expect(mocks.createClient).not.toHaveBeenCalled();
    },
  );
});
