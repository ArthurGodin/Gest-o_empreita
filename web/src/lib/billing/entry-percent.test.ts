import { describe, expect, it } from "vitest";
import {
  asaasChargeAmountValidationMessage,
  calculateEntrySplit,
  entryChargeValidationMessage,
  entryPercentValidationMessage,
  isValidEntryPercent,
  parseEntryPercentInput,
} from "./entry-percent";

describe("entry percent helpers", () => {
  it("parses pt-BR decimal input", () => {
    expect(parseEntryPercentInput("30")).toBe(30);
    expect(parseEntryPercentInput("12,5")).toBe(12.5);
    expect(parseEntryPercentInput("")).toBeNull();
    expect(parseEntryPercentInput("abc")).toBeNull();
  });

  it("accepts only percentages between 0 and 100", () => {
    expect(isValidEntryPercent(0)).toBe(true);
    expect(isValidEntryPercent(100)).toBe(true);
    expect(isValidEntryPercent(-1)).toBe(false);
    expect(isValidEntryPercent(150)).toBe(false);
    expect(entryPercentValidationMessage(150)).toBe(
      "Entrada deve ficar entre 0% e 100%.",
    );
  });

  it("calculates entry and remaining balance without negative balance", () => {
    expect(calculateEntrySplit(45150, 30)).toEqual({
      entryCents: 13545,
      saldoCents: 31605,
    });
    expect(calculateEntrySplit(45150, 100)).toEqual({
      entryCents: 45150,
      saldoCents: 0,
    });
    expect(() => calculateEntrySplit(45150, 150)).toThrow(
      "Entrada deve ficar entre 0% e 100%.",
    );
  });

  it("rejects Asaas Pix charges below the minimum amount", () => {
    expect(asaasChargeAmountValidationMessage(300)).toBe(
      "Cobrança Pix precisa ser de pelo menos R$ 5,00.",
    );
    expect(asaasChargeAmountValidationMessage(500)).toBeNull();
  });

  it("validates entry and balance against the Asaas minimum Pix amount", () => {
    expect(entryChargeValidationMessage(1000, 30)).toBe(
      "Entrada Pix precisa ser de pelo menos R$ 5,00. Aumente a entrada ou use 0% para cobrar tudo depois.",
    );
    expect(entryChargeValidationMessage(1000, 60)).toBe(
      "Saldo Pix precisa ser de pelo menos R$ 5,00. Reduza a entrada ou use 100% para cobrar tudo agora.",
    );
    expect(entryChargeValidationMessage(1000, 0)).toBeNull();
    expect(entryChargeValidationMessage(1000, 50)).toBeNull();
    expect(entryChargeValidationMessage(400, 0)).toBe(
      "Orçamento precisa ter pelo menos R$ 5,00 para gerar Pix pelo Asaas.",
    );
  });
});
