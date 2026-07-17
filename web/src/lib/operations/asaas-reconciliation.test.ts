import { describe, expect, it, vi } from "vitest";
import {
  AsaasApiError,
  AsaasConfigError,
  type AsaasRequest,
} from "@/lib/asaas/client";
import {
  classifyAsaasReadError,
  createAsaasReadClient,
  mapWithConcurrency,
} from "./asaas-reconciliation";

vi.mock("server-only", () => ({}));

function requestMock(
  implementation: (path: string, init?: Parameters<AsaasRequest>[1]) => unknown,
) {
  const mock = vi.fn(
    async (path: string, init?: Parameters<AsaasRequest>[1]) =>
      implementation(path, init),
  );
  return mock as typeof mock & AsaasRequest;
}

describe("Asaas read-only reconciliation", () => {
  it("valida disponibilidade com GET limitado e timeout", async () => {
    const request = requestMock(() => ({ data: [] }));
    const client = createAsaasReadClient({ request, timeoutMs: 250 });

    await expect(client.checkAvailability()).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "/subscriptions?limit=1",
      expect.objectContaining({
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(request.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("consulta cobranca individual sem aceitar resposta de outro id", async () => {
    const request = requestMock((path) => ({
      id: path.endsWith("pay_1") ? "pay_1" : "outro",
      status: "CONFIRMED",
    }));
    const client = createAsaasReadClient({ request });

    await expect(client.getPayment("pay_1")).resolves.toEqual({
      kind: "found",
      value: { status: "CONFIRMED" },
    });
    expect(request).toHaveBeenCalledWith(
      "/payments/pay_1",
      expect.objectContaining({ method: "GET" }),
    );

    const mismatched = createAsaasReadClient({
      request: requestMock(() => ({ id: "pay_2", status: "PENDING" })),
    });
    await expect(mismatched.getPayment("pay_1")).resolves.toEqual({
      kind: "failure",
      code: "invalid_response",
    });
  });

  it("normaliza assinatura apagada e codifica o id na URL", async () => {
    const request = requestMock(() => ({
      id: "sub/1",
      status: null,
      deleted: true,
    }));
    const client = createAsaasReadClient({ request });

    await expect(client.getSubscription("sub/1")).resolves.toEqual({
      kind: "found",
      value: { status: "DELETED" },
    });
    expect(request).toHaveBeenCalledWith(
      "/subscriptions/sub%2F1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("converte 404 em recurso ausente sem expor o body", async () => {
    const request = requestMock(() => {
      throw new AsaasApiError(404, { errors: [{ description: "segredo" }] });
    });
    const client = createAsaasReadClient({ request });
    await expect(client.getPayment("pay_1")).resolves.toEqual({
      kind: "not_found",
    });
  });

  it("classifica autenticacao, servidor, timeout, rede e erro inesperado", () => {
    expect(classifyAsaasReadError(new AsaasConfigError())).toBe("auth_invalid");
    expect(classifyAsaasReadError(new AsaasApiError(403, null))).toBe(
      "auth_invalid",
    );
    expect(classifyAsaasReadError(new AsaasApiError(503, null))).toBe(
      "server_error",
    );
    expect(classifyAsaasReadError({ name: "AbortError" })).toBe("timeout");
    expect(classifyAsaasReadError(new TypeError("fetch failed"))).toBe(
      "network",
    );
    expect(classifyAsaasReadError(new Error("other"))).toBe("unexpected");
  });

  it("rejeita payload de listagem invalido", async () => {
    const client = createAsaasReadClient({
      request: requestMock(() => ({ object: "list" })),
    });
    await expect(client.checkAvailability()).resolves.toEqual({
      ok: false,
      code: "invalid_response",
    });
  });

  it("limita concorrencia e preserva a ordem dos resultados", async () => {
    let active = 0;
    let peak = 0;
    const values = Array.from({ length: 12 }, (_, index) => index);
    const results = await mapWithConcurrency(values, 4, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    });

    expect(peak).toBe(4);
    expect(results).toEqual(values.map((value) => value * 2));
  });
});
