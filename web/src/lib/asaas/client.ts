import "server-only";

import { serverEnv } from "@/lib/env-server";

type RequestBody = Record<string, unknown>;

interface AsaasErrorBody {
  errors?: Array<{ code?: string; description?: string }>;
}

export class AsaasConfigError extends Error {
  constructor() {
    super("Asaas nao configurado. Preencha ASAAS_API_KEY e ASAAS_API_URL.");
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

export async function asaasRequest<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: RequestBody } = {},
): Promise<T> {
  if (!serverEnv.ASAAS_API_KEY) {
    throw new AsaasConfigError();
  }

  const baseUrl = serverEnv.ASAAS_API_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: serverEnv.ASAAS_API_KEY,
      "user-agent": "GestaoEmpreita/1.0",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  const body = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new AsaasApiError(response.status, body);
  }

  return body as T;
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
