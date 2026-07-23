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
      [
        "Olá, Maria!",
        "Segue o orçamento ORC-2026-0001 - Cobertura para sua avaliação.\nValor: R$\u00a0260,00.",
        "Acesse o link para ver os detalhes, aprovar ou pedir ajustes:",
        "https://app.test/q/token",
        "Qualquer dúvida, fico à disposição.",
      ].join("\n\n"),
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
      [
        "Olá, Maria!",
        "Segue a versão revisada do orçamento ORC-2026-0002 - Cobertura revisada para sua avaliação.\nValor: R$\u00a0280,00.",
        "Acesse o link para revisar, aprovar ou pedir um novo ajuste:",
        "https://app.test/q/revision",
        "Qualquer dúvida, fico à disposição.",
      ].join("\n\n"),
    );
  });

  it("uses proposal language for professional segments", () => {
    const message = buildQuoteWhatsappMessage({
      quoteTitle: "Projeto residencial",
      url: "https://app.test/q/proposal",
      documentKind: "proposal",
    });

    expect(message).toContain(
      "Segue a proposta Projeto residencial para sua avaliação.",
    );
    expect(message).not.toContain("orçamento");
  });

  it("omits optional parts without leaving broken punctuation", () => {
    expect(
      buildQuoteWhatsappMessage({
        url: "https://app.test/q/token",
      }),
    ).toBe(
      [
        "Olá!",
        "Segue o orçamento para sua avaliação.",
        "Acesse o link para ver os detalhes, aprovar ou pedir ajustes:",
        "https://app.test/q/token",
        "Qualquer dúvida, fico à disposição.",
      ].join("\n\n"),
    );
  });
});
