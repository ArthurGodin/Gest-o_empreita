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
      "Olá, Maria! Segue o orçamento ORC-2026-0001 - Cobertura para você avaliar. Valor: R$\u00a0260,00. Você pode ver, aprovar ou pedir mudanças pelo link: https://app.test/q/token",
    );
  });

  it("builds a revised quote message", () => {
    expect(
      buildQuoteWhatsappMessage({
        customerName: "Maria",
        quoteNumber: "ORC-2026-0002",
        quoteTitle: "Cobertura revisada",
        totalCents: 28000,
        url: "https://app.test/q/revision",
        mode: "revision",
      }),
    ).toBe(
      "Olá, Maria! Segue a versão revisada do orçamento ORC-2026-0002 - Cobertura revisada para você avaliar. Valor: R$\u00a0280,00. Você pode revisar, aprovar ou pedir um novo ajuste pelo link: https://app.test/q/revision",
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
