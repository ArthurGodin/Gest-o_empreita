import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env-server-core";

describe("parseServerEnv", () => {
  it("trata integracoes opcionais vazias como ausentes", () => {
    const result = parseServerEnv({
      SUPABASE_SERVICE_ROLE_KEY: "service-role-valida",
      ASAAS_API_KEY: "",
      RESEND_API_KEY: "   ",
      OPERATIONAL_ADMIN_EMAILS: "",
      CRON_SECRET: "",
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data.SUPABASE_SERVICE_ROLE_KEY).toBe("service-role-valida");
    expect(result.data.ASAAS_API_KEY).toBeUndefined();
    expect(result.data.RESEND_API_KEY).toBeUndefined();
    expect(result.data.OPERATIONAL_ADMIN_EMAILS).toBeUndefined();
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

  it("preserva a allowlist operacional somente no ambiente server-side", () => {
    const emails = "arthur@example.com,operacao@example.com";
    const result = parseServerEnv({ OPERATIONAL_ADMIN_EMAILS: emails });

    expect(result.fieldErrors).toEqual({});
    expect(result.data.OPERATIONAL_ADMIN_EMAILS).toBe(emails);
  });

  it("valida e normaliza a identidade juridica publica", () => {
    const result = parseServerEnv({
      PRUMO_LEGAL_NAME: " Prumo Tecnologia LTDA ",
      PRUMO_LEGAL_DOCUMENT: "11.222.333/0001-81",
      PRUMO_LEGAL_ADDRESS: " Rua de Teste, 100, Centro ",
      SUPPORT_EMAIL: " suporte@example.com ",
      PRUMO_LEGAL_DOCS_UPDATED_AT: "2026-07-30",
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data.PRUMO_LEGAL_NAME).toBe("Prumo Tecnologia LTDA");
    expect(result.data.PRUMO_LEGAL_ADDRESS).toBe(
      "Rua de Teste, 100, Centro",
    );
    expect(result.data.SUPPORT_EMAIL).toBe("suporte@example.com");
  });

  it("isola campos juridicos invalidos sem descartar os validos", () => {
    const result = parseServerEnv({
      PRUMO_LEGAL_NAME: "Prumo Tecnologia LTDA",
      PRUMO_LEGAL_DOCUMENT: "documento-invalido",
      SUPPORT_EMAIL: "email-invalido",
      PRUMO_LEGAL_DOCS_UPDATED_AT: "2026-02-29",
    });

    expect(result.data.PRUMO_LEGAL_NAME).toBe("Prumo Tecnologia LTDA");
    expect(result.data.PRUMO_LEGAL_DOCUMENT).toBeUndefined();
    expect(result.data.SUPPORT_EMAIL).toBeUndefined();
    expect(result.data.PRUMO_LEGAL_DOCS_UPDATED_AT).toBeUndefined();
    expect(result.fieldErrors.PRUMO_LEGAL_DOCUMENT).toBeDefined();
    expect(result.fieldErrors.SUPPORT_EMAIL).toBeDefined();
    expect(result.fieldErrors.PRUMO_LEGAL_DOCS_UPDATED_AT).toBeDefined();
  });
});
