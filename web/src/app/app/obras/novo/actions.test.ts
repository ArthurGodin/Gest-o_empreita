import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDirectProjectAction,
  type DirectProjectActionInput,
} from "./actions";
import { directProjectDestination } from "./direct-project-destination";

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
  clientErrorFor: () => "Não foi possível concluir agora.",
  logServerError: mocks.logServerError,
  logServerEvent: mocks.logServerEvent,
}));

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const CREATION_KEY = "44444444-4444-4444-8444-444444444444";

function validInput(
  overrides: Partial<DirectProjectActionInput> = {},
): DirectProjectActionInput {
  return {
    creation_key: CREATION_KEY,
    goal: "client_briefing",
    customer_mode: "new",
    existing_customer_id: null,
    customer_name: "Cliente Teste",
    customer_document: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    customer_city: "",
    customer_state: "",
    customer_zip_code: "",
    project_name: "Residência Teste",
    project_description: "",
    project_address: "",
    project_status: "planning",
    starts_on: null,
    ends_on: null,
    budget_cents: null,
    template_id: null,
    ...overrides,
  };
}

describe("createDirectProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-id" });
    mocks.getActiveCompany.mockResolvedValue({
      company_id: COMPANY_ID,
      role: "owner",
      company: {
        business_segment: "architecture",
        activation_goal: "client_briefing",
      },
    });
  });

  it("creates customer and project through the atomic RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          created_project_id: PROJECT_ID,
          created_customer_id: CUSTOMER_ID,
        },
      ],
      error: null,
    });
    mocks.createClient.mockReturnValue({ rpc });

    const result = await createDirectProjectAction(validInput());

    expect(result).toEqual({
      ok: true,
      projectId: PROJECT_ID,
      redirectTo: `/app/obras/${PROJECT_ID}?view=briefing`,
    });
    expect(rpc).toHaveBeenCalledWith(
      "create_direct_project",
      expect.objectContaining({
        p_company_id: COMPANY_ID,
        p_creation_key: CREATION_KEY,
        p_customer_name: "Cliente Teste",
        p_project_name: "Residência Teste",
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/obras");
  });

  it("rejects the sales objective before touching the database", async () => {
    await expect(
      createDirectProjectAction(validInput({ goal: "sell" })),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a cross-segment objective before touching the database", async () => {
    mocks.getActiveCompany.mockResolvedValue({
      company_id: COMPANY_ID,
      role: "owner",
      company: {
        business_segment: "construction",
        activation_goal: "execution_control",
      },
    });

    await expect(
      createDirectProjectAction(validInput({ goal: "client_briefing" })),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

describe("directProjectDestination", () => {
  it.each([
    ["existing_project", "?view=etapas"],
    ["client_briefing", "?view=briefing"],
    ["deliverables", "?view=entregas"],
    ["execution_control", "?view=gestao#custos"],
  ] as const)("maps %s to its operational workspace", (goal, suffix) => {
    expect(directProjectDestination(PROJECT_ID, goal)).toBe(
      `/app/obras/${PROJECT_ID}${suffix}`,
    );
  });
});
