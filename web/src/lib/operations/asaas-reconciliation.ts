import "server-only";

import {
  AsaasApiError,
  AsaasConfigError,
  asaasRequest,
  type AsaasRequest,
} from "@/lib/asaas/client";
import type {
  AsaasListResponse,
  AsaasReadPayment,
  AsaasReadSubscription,
} from "@/lib/asaas/types";
import type {
  AsaasHealthSignal,
  AsaasLookup,
  AsaasReadErrorCode,
  RemotePaymentSignal,
  RemoteSubscriptionSignal,
} from "./monitor-core";

const DEFAULT_TIMEOUT_MS = 4_000;

export interface AsaasReadClient {
  checkAvailability(): Promise<AsaasHealthSignal>;
  getPayment(paymentId: string): Promise<AsaasLookup<RemotePaymentSignal>>;
  getSubscription(
    subscriptionId: string,
  ): Promise<AsaasLookup<RemoteSubscriptionSignal>>;
}

export function createAsaasReadClient(
  options: { request?: AsaasRequest; timeoutMs?: number } = {},
): AsaasReadClient {
  const request = options.request ?? asaasRequest;
  const timeoutMs = normalizeTimeout(options.timeoutMs);

  return {
    async checkAvailability() {
      try {
        const response = await request<AsaasListResponse<AsaasReadSubscription>>(
          "/subscriptions?limit=1",
          readOnlyInit(timeoutMs),
        );
        if (!response || !Array.isArray(response.data)) {
          return { ok: false, code: "invalid_response" };
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, code: classifyAsaasReadError(error) };
      }
    },

    async getPayment(paymentId) {
      const id = paymentId.trim();
      if (!id) return { kind: "failure", code: "invalid_response" };

      try {
        const response = await request<AsaasReadPayment>(
          `/payments/${encodeURIComponent(id)}`,
          readOnlyInit(timeoutMs),
        );
        if (
          !response ||
          response.id !== id ||
          typeof response.status !== "string" ||
          !response.status.trim()
        ) {
          return { kind: "failure", code: "invalid_response" };
        }
        return { kind: "found", value: { status: response.status } };
      } catch (error) {
        if (error instanceof AsaasApiError && error.status === 404) {
          return { kind: "not_found" };
        }
        return { kind: "failure", code: classifyAsaasReadError(error) };
      }
    },

    async getSubscription(subscriptionId) {
      const id = subscriptionId.trim();
      if (!id) return { kind: "failure", code: "invalid_response" };

      try {
        const response = await request<AsaasReadSubscription>(
          `/subscriptions/${encodeURIComponent(id)}`,
          readOnlyInit(timeoutMs),
        );
        const status = response?.deleted ? "DELETED" : response?.status;
        if (
          !response ||
          response.id !== id ||
          typeof status !== "string" ||
          !status.trim()
        ) {
          return { kind: "failure", code: "invalid_response" };
        }
        return { kind: "found", value: { status } };
      } catch (error) {
        if (error instanceof AsaasApiError && error.status === 404) {
          return { kind: "not_found" };
        }
        return { kind: "failure", code: classifyAsaasReadError(error) };
      }
    },
  };
}

export function classifyAsaasReadError(error: unknown): AsaasReadErrorCode {
  if (error instanceof AsaasConfigError) return "auth_invalid";
  if (error instanceof AsaasApiError) {
    if (error.status === 401 || error.status === 403) return "auth_invalid";
    if (error.status >= 500) return "server_error";
    return "unexpected";
  }
  if (isAbortError(error)) return "timeout";
  if (error instanceof TypeError) return "network";
  return "unexpected";
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (values.length === 0) return [];
  const workerCount = Math.min(normalizeConcurrency(concurrency), values.length);
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function readOnlyInit(timeoutMs: number) {
  return {
    method: "GET" as const,
    signal: AbortSignal.timeout(timeoutMs),
  };
}

function normalizeTimeout(value?: number) {
  return Number.isInteger(value) && value && value >= 100 && value <= 30_000
    ? value
    : DEFAULT_TIMEOUT_MS;
}

function normalizeConcurrency(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 10 ? value : 4;
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
