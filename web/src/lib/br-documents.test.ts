import { describe, expect, it } from "vitest";
import { isValidCpfCnpj, normalizeCpfCnpj } from "./br-documents";

describe("Brazilian document helpers", () => {
  it("normalizes CPF/CNPJ to digits only", () => {
    expect(normalizeCpfCnpj("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpfCnpj("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("validates CPF check digits", () => {
    expect(isValidCpfCnpj("529.982.247-25")).toBe(true);
    expect(isValidCpfCnpj("123.456.789-01")).toBe(false);
    expect(isValidCpfCnpj("111.111.111-11")).toBe(false);
  });

  it("validates CNPJ check digits", () => {
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCpfCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCpfCnpj("00.000.000/0000-00")).toBe(false);
  });
});
