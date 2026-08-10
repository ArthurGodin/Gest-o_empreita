import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction, signupAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  sendMetaConversionsEvent: vi.fn(),
  sendOperationalAlert: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({
    cookie: "prumo_marketing_consent=v1.granted",
  })),
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/lib/alerts", () => ({
  sendOperationalAlert: mocks.sendOperationalAlert,
}));
vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://prumo.test" },
}));
vi.mock("@/lib/log", () => ({
  logServerError: vi.fn(),
  logServerEvent: vi.fn(),
}));
vi.mock("@/lib/meta-conversions", () => ({
  sendMetaConversionsEvent: mocks.sendMetaConversionsEvent,
}));
vi.mock("@/lib/meta-events", () => ({
  createProductEventId: () => "signup_completed-server-occurrence-123",
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

function signupForm(
  plan?: "pro" | "ultimate",
  businessSegment?: string,
) {
  const form = new FormData();
  form.set("name", "Pessoa Teste");
  form.set("email", "pessoa@example.com");
  form.set("password", "senha-segura");
  if (plan) form.set("plan", plan);
  if (businessSegment) form.set("business_segment", businessSegment);
  return form;
}

function loginForm(options?: {
  plan?: "pro" | "ultimate";
  businessSegment?: string;
}) {
  const form = new FormData();
  form.set("email", "pessoa@example.com");
  form.set("password", "senha-segura");
  if (options?.plan) form.set("plan", options.plan);
  if (options?.businessSegment) {
    form.set("business_segment", options.businessSegment);
  }
  return form;
}

function membershipQuery(rows: Array<{ company_id: string }>) {
  const query = {
    select: vi.fn(),
    limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: rows, error: null });
  return query;
}

describe("signup conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockReturnValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signUp: mocks.signUp,
      },
    });
    mocks.sendMetaConversionsEvent.mockResolvedValue({ sent: true });
    mocks.sendOperationalAlert.mockResolvedValue(undefined);
  });

  it("shares the completed signup occurrence with CAPI and onboarding", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });

    await signupAction(signupForm("ultimate"));

    expect(mocks.sendMetaConversionsEvent).toHaveBeenCalledWith({
      name: "signup_completed",
      properties: { target_plan: "ultimate" },
      eventId: "signup_completed-server-occurrence-123",
      path: "/signup",
      requestHeaders: expect.any(Headers),
      externalId: "user-id",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/onboarding?signup_event_id=signup_completed-server-occurrence-123&plan=ultimate",
    );
  });

  it("does not emit a completed conversion when Auth rejects signup", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthError", status: 422 },
    });

    await expect(signupAction(signupForm())).resolves.toMatchObject({
      ok: false,
    });
    expect(mocks.sendMetaConversionsEvent).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("carries a validated demo profile into onboarding and conversion", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });

    await signupAction(signupForm(undefined, "interiors"));

    expect(mocks.sendMetaConversionsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          target_plan: "free",
          business_segment: "interiors",
        },
      }),
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/onboarding?signup_event_id=signup_completed-server-occurrence-123&perfil=interiors",
    );
  });

  it("drops an invalid profile instead of assigning a fallback", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });

    await signupAction(signupForm(undefined, "student"));

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/onboarding?signup_event_id=signup_completed-server-occurrence-123",
    );
  });
});

describe("login acquisition context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  it("sends an account without a company to contextual onboarding", async () => {
    const memberships = membershipQuery([]);
    mocks.createClient.mockReturnValue({
      auth: { signInWithPassword: mocks.signInWithPassword },
      from: vi.fn(() => memberships),
    });

    await loginAction(
      loginForm({ plan: "pro", businessSegment: "architecture" }),
    );

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/onboarding?plan=pro&perfil=architecture",
    );
  });

  it("never changes the profile of an existing company", async () => {
    const memberships = membershipQuery([{ company_id: "existing-company" }]);
    mocks.createClient.mockReturnValue({
      auth: { signInWithPassword: mocks.signInWithPassword },
      from: vi.fn(() => memberships),
    });

    await loginAction(loginForm({ businessSegment: "engineering" }));

    expect(mocks.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining("/onboarding"),
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/app");
  });
});
