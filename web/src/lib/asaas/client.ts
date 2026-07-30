import "server-only";

import { serverEnv } from "@/lib/env-server";

type RequestBody = Record<string, unknown>;

export const ASAAS_REQUEST_TIMEOUT_MS = 10_000;

export interface AsaasRequestInit {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: RequestBody;
  signal?: AbortSignal;
}

export type AsaasRequest = <T>(
  path: string,
  init?: AsaasRequestInit,
) => Promise<T>;

interface AsaasErrorBody {
  errors?: Array<{ code?: string; description?: string }>;
}

export class AsaasConfigError extends Error {
  constructor() {
    super("Asaas não configurado. Preencha ASAAS_API_KEY e ASAAS_API_URL.");
    this.name = "AsaasConfigError";
  }
}

export class AsaasApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(messageFromBody(status, body));
    this.name = "AsaasApiError";
    this.status = status;
    this.body = body;
  }
}

export class AsaasTimeoutError extends AsaasApiError {
  constructor() {
    super(504, null);
    this.message =
      "O Asaas demorou para responder. Aguarde um instante e tente novamente.";
    this.name = "AsaasTimeoutError";
  }
}

export async function asaasRequest<T>(
  path: string,
  init: AsaasRequestInit = {},
): Promise<T> {
  if (!serverEnv.ASAAS_API_KEY) {
    throw new AsaasConfigError();
  }

  const baseUrl = serverEnv.ASAAS_API_URL.replace(/\/$/, "");
  const requestSignal = createRequestSignal(init.signal);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        access_token: serverEnv.ASAAS_API_KEY,
        "user-agent": "Prumo/1.0",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: requestSignal.signal,
      cache: "no-store",
    });

    const text = await response.text();
    const body = text ? safeJson(text) : null;

    if (!response.ok) {
      throw new AsaasApiError(response.status, body);
    }

    if (requestSignal.didTimeout()) {
      throw new AsaasTimeoutError();
    }

    return body as T;
  } catch (error) {
    if (
      requestSignal.didTimeout() &&
      !(error instanceof AsaasTimeoutError)
    ) {
      throw new AsaasTimeoutError();
    }
    throw error;
  } finally {
    requestSignal.cleanup();
  }
}

function createRequestSignal(callerSignal?: AbortSignal) {
  const controller = new AbortController();
  let timeoutTriggered = false;

  const timeout = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort(
      new DOMException("asaas_request_timeout", "TimeoutError"),
    );
  }, ASAAS_REQUEST_TIMEOUT_MS);

  const abortFromCaller = () => {
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timeoutTriggered,
    cleanup: () => {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFromBody(status: number, body: unknown): string {
  const parsed = body as AsaasErrorBody | null;
  const first = parsed?.errors?.[0]?.description;
  return first ?? `Asaas retornou erro HTTP ${status}.`;
}
