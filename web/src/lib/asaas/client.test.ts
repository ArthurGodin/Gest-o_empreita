import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ASAAS_REQUEST_TIMEOUT_MS,
  AsaasApiError,
  AsaasTimeoutError,
  asaasRequest,
} from "./client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env-server", () => ({
  serverEnv: {
    ASAAS_API_KEY: "test-api-key",
    ASAAS_API_URL: "https://asaas.test/v3",
  },
}));

const fetchMock = vi.fn<typeof fetch>();

function pendingFetch(_input: RequestInfo | URL, init?: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    const signal = init?.signal;
    const rejectFromAbort = () => {
      reject(signal?.reason ?? new DOMException("aborted", "AbortError"));
    };

    if (signal?.aborted) {
      rejectFromAbort();
      return;
    }
    signal?.addEventListener("abort", rejectFromAbort, { once: true });
  });
}

describe("Asaas client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns a normal JSON response and clears the timeout", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "pay_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      asaasRequest<{ id: string }>("/payments/pay_1"),
    ).resolves.toEqual({ id: "pay_1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts a stalled write once and returns a typed timeout", async () => {
    fetchMock.mockImplementation(pendingFetch);

    const result = expect(
      asaasRequest("/paymentLinks", {
        method: "POST",
        body: { value: 97 },
      }),
    ).rejects.toBeInstanceOf(AsaasTimeoutError);

    await vi.advanceTimersByTimeAsync(ASAAS_REQUEST_TIMEOUT_MS);
    await result;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves cancellation supplied by the caller", async () => {
    fetchMock.mockImplementation(pendingFetch);
    const controller = new AbortController();
    const callerReason = new DOMException("caller_cancelled", "AbortError");

    const request = asaasRequest("/payments", {
      signal: controller.signal,
    });
    const result = expect(request).rejects.toBe(callerReason);
    controller.abort(callerReason);
    await result;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps API errors distinct from transport timeouts", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ description: "Dados recusados" }],
        }),
        { status: 400 },
      ),
    );

    const result = asaasRequest("/payments", {
      method: "POST",
      body: { value: 1 },
    });

    await expect(result).rejects.toMatchObject({
      name: "AsaasApiError",
      status: 400,
      message: "Dados recusados",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("models timeout as a specialized Asaas API failure", () => {
    expect(new AsaasTimeoutError()).toBeInstanceOf(AsaasApiError);
  });
});
