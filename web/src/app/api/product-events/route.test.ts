import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  logServerEvent: vi.fn(),
  logServerWarning: vi.fn(),
  sendMetaConversionsEvent: vi.fn(),
  sendOperationalAlert: vi.fn(),
}));

vi.mock("@/lib/alerts", () => ({
  sendOperationalAlert: mocks.sendOperationalAlert,
}));
vi.mock("@/lib/log", () => ({
  logServerEvent: mocks.logServerEvent,
  logServerWarning: mocks.logServerWarning,
}));
vi.mock("@/lib/meta-conversions", () => ({
  sendMetaConversionsEvent: mocks.sendMetaConversionsEvent,
}));

describe("POST /api/product-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendOperationalAlert.mockResolvedValue(undefined);
    mocks.sendMetaConversionsEvent.mockResolvedValue(undefined);
  });

  it("preserves the occurrence id through log, alert and conversion event", async () => {
    const request = productRequest({
      name: "app_error_boundary",
      eventId: "app-error-occurrence-123",
      path: "/q/secret-customer-token/aprovado",
      properties: { digest: "digest-123" },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.logServerEvent).toHaveBeenCalledWith(
      "product_event",
      expect.objectContaining({
        event: "app_error_boundary",
        event_id: "app-error-occurrence-123",
        path: "/q/[token]/aprovado",
      }),
    );
    expect(mocks.sendOperationalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        area: "frontend",
        severity: "critical",
        context: expect.objectContaining({
          event_id: "app-error-occurrence-123",
          path: "/q/[token]/aprovado",
          digest: "digest-123",
        }),
      }),
    );
    expect(mocks.sendMetaConversionsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "app-error-occurrence-123",
        path: "/q/[token]/aprovado",
      }),
    );
  });

  it("generates one id for the entire pipeline when the client omits it", async () => {
    const response = await POST(
      productRequest({ name: "global_error_boundary", properties: {} }),
    );

    expect(response.status).toBe(200);
    const logged = mocks.logServerEvent.mock.calls[0]?.[1] as {
      event_id?: string;
    };
    expect(logged.event_id).toMatch(/^global_error_boundary-/);
    expect(mocks.sendOperationalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ event_id: logged.event_id }),
      }),
    );
    expect(mocks.sendMetaConversionsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: logged.event_id }),
    );
  });

  it("rejects unknown events without emitting logs, alerts or conversions", async () => {
    const response = await POST(
      productRequest({ name: "invented_event", properties: {} }),
    );

    expect(response.status).toBe(400);
    expect(mocks.logServerEvent).not.toHaveBeenCalled();
    expect(mocks.sendOperationalAlert).not.toHaveBeenCalled();
    expect(mocks.sendMetaConversionsEvent).not.toHaveBeenCalled();
  });
});

function productRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/product-events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-vercel-id": "gru1::qa-request",
    },
    body: JSON.stringify(body),
  });
}
