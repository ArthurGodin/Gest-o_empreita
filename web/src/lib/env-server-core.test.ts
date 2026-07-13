import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env-server-core";

describe("parseServerEnv", () => {
  it("trata integracoes opcionais vazias como ausentes", () => {
    const result = parseServerEnv({
      SUPABASE_SERVICE_ROLE_KEY: "service-role-valida",
      ASAAS_API_KEY: "",
      RESEND_API_KEY: "   ",
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-valida");
    expect(result.data.ASAAS_API_KEY).toBeUndefined();
    expect(result.data.RESEND_API_KEY).toBeUndefined();
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
});
