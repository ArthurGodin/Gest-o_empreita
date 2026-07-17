import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env-server-core";

describe("parseServerEnv", () => {
  it("trata integracoes opcionais vazias como ausentes", () => {
    const result = parseServerEnv({
      SUPABASE_SERVICE_ROLE_KEY: "service-role-valida",
      ASAAS_API_KEY: "",
      RESEND_API_KEY: "   ",
      CRON_SECRET: "",
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-valida");
    expect(result.data.ASAAS_API_KEY).toBeUndefined();
    expect(result.data.RESEND_API_KEY).toBeUndefined();
    expect(result.data.CRON_SECRET).toBeUndefined();
  });

  it("preserva campos validos quando outro campo esta invalido", () => {
    const result = parseServerEnv({
      SUPABASE_SERVICE_ROLE_KEY: "service-role-valida",
      ASAAS_API_URL: "url-invalida",
    });

    expect(result.fieldErrors.ASAAS_API_URL).toBeDefined();
    expect(result.data.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-valida");
    expect(result.data.ASAAS_API_URL).toBe(
      "https://api-sandbox.asaas.com/v3",
    );
  });

  it("aplica os padroes quando a validacao e ignorada", () => {
    const result = parseServerEnv({});

    expect(result.fieldErrors).toEqual({});
    expect(result.data.ASAAS_API_URL).toBe(
      "https://api-sandbox.asaas.com/v3",
    );
    expect(result.data.META_GRAPH_API_VERSION).toBe("v23.0");
  });
  it("aceita apenas segredo de cron com tamanho operacional minimo", () => {
    const invalid = parseServerEnv({ CRON_SECRET: "curto" });
    const validSecret = "a".repeat(43);
    const valid = parseServerEnv({ CRON_SECRET: validSecret });

    expect(invalid.fieldErrors.CRON_SECRET).toBeDefined();
    expect(invalid.data.CRON_SECRET).toBeUndefined();
    expect(valid.fieldErrors).toEqual({});
    expect(valid.data.CRON_SECRET).toBe(validSecret);
  });
});
