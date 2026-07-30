import { describe, expect, it } from "vitest";
import { buildLegalIdentity, isValidIsoDate } from "./legal-identity";

const completeInput = {
  legalName: "Prumo Tecnologia LTDA",
  legalDocument: "11.222.333/0001-81",
  legalAddress: "Rua de Teste, 100, Centro, São Paulo - SP",
  supportEmail: "suporte@example.com",
  docsUpdatedAt: "2026-07-30",
};

describe("legal identity", () => {
  it("exposes a formatted public identity only when every field is valid", () => {
    const result = buildLegalIdentity(completeInput);

    expect(result.complete).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.invalidFields).toEqual([]);
    expect(result.supportEmail).toBe("suporte@example.com");
    expect(result.publicIdentity).toEqual({
      legalName: "Prumo Tecnologia LTDA",
      documentType: "CNPJ",
      formattedDocument: "11.222.333/0001-81",
      legalAddress: "Rua de Teste, 100, Centro, São Paulo - SP",
      supportEmail: "suporte@example.com",
      docsUpdatedAt: "2026-07-30",
      formattedDocsUpdatedAt: "30/07/2026",
    });
  });

  it("keeps a valid support channel available without exposing partial legal data", () => {
    const result = buildLegalIdentity({
      supportEmail: " suporte@example.com ",
    });

    expect(result.complete).toBe(false);
    expect(result.supportEmail).toBe("suporte@example.com");
    expect(result.publicIdentity).toBeNull();
    expect(result.missingFields).toEqual([
      "legalName",
      "legalDocument",
      "legalAddress",
      "docsUpdatedAt",
    ]);
  });

  it("separates missing fields from invalid fields without returning their values", () => {
    const result = buildLegalIdentity({
      ...completeInput,
      legalDocument: "123",
      supportEmail: "email-invalido",
      legalAddress: "",
    });

    expect(result.complete).toBe(false);
    expect(result.missingFields).toEqual(["legalAddress"]);
    expect(result.invalidFields).toEqual([
      "legalDocument",
      "supportEmail",
    ]);
    expect(result.supportEmail).toBeNull();
    expect(result.publicIdentity).toBeNull();
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("30/07/2026")).toBe(false);
  });
});
