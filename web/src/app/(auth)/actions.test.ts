import { beforeEach, describe, expect, it, vi } from "vitest";
import { signupAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  sendMetaConversionsEvent: vi.fn(),
  sendOperationalAlert: vi.fn(),
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

function signupForm(plan?: "pro" | "ultimate") {
  const form = new FormData();
  form.set("name", "Pessoa Teste");
  form.set("email", "pessoa@example.com");
  form.set("password", "senha-segura");
  if (plan) form.set("plan", plan);
  return form;
}

describe("signup conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockReturnValue({
      auth: { signUp: mocks.signUp },
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
});
