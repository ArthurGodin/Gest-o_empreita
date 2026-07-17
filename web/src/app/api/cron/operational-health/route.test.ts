import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  env: { CRON_SECRET: "a".repeat(43) as string | undefined },
  logServerError: vi.fn(),
  logServerEvent: vi.fn(),
  logServerWarning: vi.fn(),
  runOperationalMonitor: vi.fn(),
}));

vi.mock("@/lib/env-server", () => ({ serverEnv: mocks.env }));
vi.mock("@/lib/log", () => ({
  logServerError: mocks.logServerError,
  logServerEvent: mocks.logServerEvent,
  logServerWarning: mocks.logServerWarning,
}));
vi.mock("@/lib/operations/monitor", () => ({
  runOperationalMonitor: mocks.runOperationalMonitor,
}));

describe("GET /api/cron/operational-health", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T11:15:00.000Z"));
    vi.clearAllMocks();
    mocks.env.CRON_SECRET = "a".repeat(43);
    mocks.runOperationalMonitor.mockResolvedValue({
      status: "healthy",
      alertCount: 0,
      incidentCount: 0,
    });
  });

  afterEach(() => vi.useRealTimers());

  it("rejects missing and invalid credentials before running", async () => {
    for (const authorization of [undefined, "Bearer errado"]) {
      const response = await GET(request({ authorization }));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        ok: false,
        status: "unauthorized",
      });
    }
    expect(mocks.runOperationalMonitor).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is not configured", async () => {
    mocks.env.CRON_SECRET = undefined;
    const response = await GET(
      request({ authorization: `Bearer ${"a".repeat(43)}` }),
    );
    expect(response.status).toBe(401);
    expect(mocks.runOperationalMonitor).not.toHaveBeenCalled();
  });

  it("uses a daily UTC key only for the Vercel cron user-agent", async () => {
    const response = await GET(
      request({
        authorization: `Bearer ${"a".repeat(43)}`,
        userAgent: "vercel-cron/1.0",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "healthy" });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.runOperationalMonitor).toHaveBeenCalledWith({
      runKey: "cron:2026-07-17",
      trigger: "cron",
    });
  });

  it("registers an authorized non-Vercel invocation as manual", async () => {
    await GET(
      request({
        authorization: `Bearer ${"a".repeat(43)}`,
        userAgent: "qa-manual",
      }),
    );
    expect(mocks.runOperationalMonitor).toHaveBeenCalledWith({
      runKey: expect.stringMatching(/^manual:[0-9a-f-]{36}$/),
      trigger: "manual",
    });
  });

  it("returns 200 for incidents without exposing their context", async () => {
    mocks.runOperationalMonitor.mockResolvedValue({
      status: "critical",
      alertCount: 1,
      incidentCount: 3,
    });
    const response = await GET(
      request({ authorization: `Bearer ${"a".repeat(43)}` }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(body)).toEqual({ ok: true, status: "critical" });
    expect(body).not.toContain("incidentCount");
    expect(body).not.toContain("fingerprint");
  });

  it("returns a sanitized 500 when the executor fails", async () => {
    mocks.runOperationalMonitor.mockRejectedValue(
      new Error("CPF 06024377339 database secret"),
    );
    const response = await GET(
      request({ authorization: `Bearer ${"a".repeat(43)}` }),
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ ok: false, status: "failed" });
    expect(body).not.toContain("06024377339");
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "ops.monitor.request_failed",
      expect.objectContaining({ message: "monitor_failed" }),
      expect.any(Object),
    );
  });
});

function request(input: {
  authorization?: string;
  userAgent?: string;
}) {
  const headers = new Headers({ "x-vercel-id": "gru1::ops-test" });
  if (input.authorization) headers.set("authorization", input.authorization);
  if (input.userAgent) headers.set("user-agent", input.userAgent);
  return new Request("http://localhost/api/cron/operational-health", { headers });
}
