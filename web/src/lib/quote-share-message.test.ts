import { describe, expect, it } from "vitest";
import { buildQuoteWhatsappMessage } from "./quote-share-message";

describe("quote share message", () => {
  it("builds a complete WhatsApp message for a quote", () => {
    expect(
      buildQuoteWhatsappMessage({
        customerName: "Maria",
        quoteNumber: "ORC-2026-0001",
        quoteTitle: "Cobertura",
        totalCents: 26000,
        url: "https://app.test/q/token",
      }),
    ).toBe(
      "Olá, Maria! Segue o orçamento ORC-2026-0001 - Cobertura para você avaliar. Valor: R$ 260,00. Você pode ver, aprovar ou pedir mudanças pelo link: https://app.test/q/token",
    );
  });

  it("omits optional parts without leaving broken punctuation", () => {
    expect(
      buildQuoteWhatsappMessage({
        url: "https://app.test/q/token",
      }),
    ).toBe(
      "Olá! Segue o orçamento para você avaliar. Você pode ver, aprovar ou pedir mudanças pelo link: https://app.test/q/token",
    );
  });
});
