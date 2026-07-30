import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCompanyAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  sendMetaConversionsEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({
    cookie: "prumo_marketing_consent=v1.granted",
  })),
}));
vi.mock("@/lib/log", () => ({
  clientErrorFor: () => "Erro seguro.",
  logServerError: vi.fn(),
  logServerEvent: vi.fn(),
}));
vi.mock("@/lib/meta-conversions", () => ({
  sendMetaConversionsEvent: mocks.sendMetaConversionsEvent,
}));
vi.mock("@/lib/meta-events", () => ({
  createProductEventId: () =>
    "onboarding_completed-server-occurrence-123",
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

function onboardingForm(plan?: "pro" | "ultimate") {
  const form = new FormData();
  form.set("business_segment", "architecture");
  form.set("name", "Estúdio Teste");
  form.set("phone", "");
  form.set("city", "Fortaleza");
  form.set("state", "CE");
  if (plan) form.set("plan", plan);
  return form;
}

function membershipQuery(rows: Array<{ company_id: string }>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: rows, error: null });
  return query;
}

function bootstrapAdmin() {
  const companyInsert = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  companyInsert.insert.mockReturnValue(companyInsert);
  companyInsert.select.mockReturnValue(companyInsert);
  companyInsert.single.mockResolvedValue({
    data: { id: "company-id" },
    error: null,
  });

  const memberInsert = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === "companies") return companyInsert;
        if (table === "company_members") return memberInsert;
        throw new Error(`unexpected_table:${table}`);
      }),
    },
  };
}

describe("onboarding conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendMetaConversionsEvent.mockResolvedValue({ sent: true });
  });

  it("returns the same occurrence sent after a successful bootstrap", async () => {
    mocks.createClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-id" } },
        }),
      },
      from: vi.fn(() => membershipQuery([])),
    });
    mocks.createAdminClient.mockReturnValue(bootstrapAdmin().client);

    await expect(
      createCompanyAction(onboardingForm("pro")),
    ).resolves.toEqual({
      ok: true,
      redirectTo: "/app/configuracoes/plano/checkout?plan=pro",
      eventId: "onboarding_completed-server-occurrence-123",
    });
    expect(mocks.sendMetaConversionsEvent).toHaveBeenCalledWith({
      name: "onboarding_completed",
      properties: {
        business_segment: "architecture",
        target_plan: "pro",
        redirects_to_checkout: true,
      },
      eventId: "onboarding_completed-server-occurrence-123",
      path: "/onboarding",
      requestHeaders: expect.any(Headers),
      externalId: "user-id",
    });
  });

  it("does not count replay from an already onboarded account", async () => {
    mocks.createClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-id" } },
        }),
      },
      from: vi.fn(() => membershipQuery([{ company_id: "existing" }])),
    });

    await expect(createCompanyAction(onboardingForm())).resolves.toEqual({
      ok: true,
      redirectTo: "/app",
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.sendMetaConversionsEvent).not.toHaveBeenCalled();
  });
});
