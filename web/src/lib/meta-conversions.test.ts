import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hashMetaExternalId,
  sendMetaConversionsEvent,
} from "./meta-conversions";

const mocks = vi.hoisted(() => ({
  logServerWarning: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://prumo.test",
    NEXT_PUBLIC_META_PIXEL_ID: "123456789",
  },
}));
vi.mock("@/lib/env-server", () => ({
  serverEnv: {
    META_CONVERSIONS_ACCESS_TOKEN: "private-meta-token",
    META_GRAPH_API_VERSION: "v23.0",
    META_TEST_EVENT_CODE: undefined,
  },
}));
vi.mock("@/lib/log", () => ({
  logServerWarning: mocks.logServerWarning,
}));

const fetchMock = vi.fn<typeof fetch>();

function headers(cookie = "") {
  return new Headers({
    cookie,
    "user-agent": "must-not-be-sent",
    "x-forwarded-for": "203.0.113.10",
  });
}

function conversionInput(cookie: string) {
  return {
    name: "signup_completed" as const,
    properties: { target_plan: "pro" },
    eventId: "signup_completed-server-occurrence-123",
    path: "/signup",
    requestHeaders: headers(cookie),
    externalId: "USER-00000000-0000-4000-8000-000000000001",
  };
}

describe("Meta Conversions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it.each([
    "",
    "prumo_marketing_consent=v1.denied",
    "prumo_marketing_consent=v2.granted",
  ])("does not send before explicit current consent (%s)", async (cookie) => {
    await expect(
      sendMetaConversionsEvent(conversionInput(cookie)),
    ).resolves.toEqual({
      sent: false,
      reason: "consent_not_granted",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a deduplicated conversion without direct personal data", async () => {
    await expect(
      sendMetaConversionsEvent(
        conversionInput(
          [
            "prumo_marketing_consent=v1.granted",
            "_fbp=fb.1.123.456",
            "_fbc=fb.1.123.click",
          ].join("; "),
        ),
      ),
    ).resolves.toEqual({ sent: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain(
      "graph.facebook.com/v23.0/123456789/events",
    );
    const payload = JSON.parse(String(init?.body));
    const event = payload.data[0];

    expect(event).toMatchObject({
      event_name: "Lead",
      event_id: "signup_completed-server-occurrence-123",
      event_source_url: "https://prumo.test/signup",
      action_source: "website",
      user_data: {
        fbp: "fb.1.123.456",
        fbc: "fb.1.123.click",
        external_id: [
          hashMetaExternalId(
            "USER-00000000-0000-4000-8000-000000000001",
          ),
        ],
      },
    });
    expect(event.user_data).not.toHaveProperty("em");
    expect(event.user_data).not.toHaveProperty("ph");
    expect(event.user_data).not.toHaveProperty("client_ip_address");
    expect(event.user_data).not.toHaveProperty("client_user_agent");
    expect(JSON.stringify(payload)).not.toContain("must-not-be-sent");
    expect(JSON.stringify(payload)).not.toContain("203.0.113.10");
  });

  it("refuses client-only funnel events at the server boundary", async () => {
    await expect(
      sendMetaConversionsEvent({
        ...conversionInput("prumo_marketing_consent=v1.granted"),
        name: "saas_checkout_started",
      }),
    ).resolves.toEqual({
      sent: false,
      reason: "unsupported_event",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps provider failures sanitized and non-blocking", async () => {
    fetchMock.mockResolvedValueOnce(new Response("private response", {
      status: 500,
    }));

    await expect(
      sendMetaConversionsEvent(
        conversionInput("prumo_marketing_consent=v1.granted"),
      ),
    ).resolves.toEqual({
      sent: false,
      reason: "provider_error",
    });
    expect(mocks.logServerWarning).toHaveBeenCalledWith(
      "meta.capi.failed",
      expect.not.objectContaining({ response: expect.anything() }),
    );
  });
});
