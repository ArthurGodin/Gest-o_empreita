import { formatBRL } from "./utils";

export type QuoteShareMessageMode = "quote" | "revision";
export type QuoteShareDocumentKind = "budget" | "proposal";

interface QuoteWhatsappMessageInput {
  customerName?: string | null;
  quoteNumber?: string | null;
  quoteTitle?: string | null;
  totalCents?: number | null;
  url: string;
  mode?: QuoteShareMessageMode;
  documentKind?: QuoteShareDocumentKind;
}

export function buildQuoteWhatsappMessage({
  customerName,
  quoteNumber,
  quoteTitle,
  totalCents,
  url,
  mode = "quote",
  documentKind = "budget",
}: QuoteWhatsappMessageInput): string {
  const greeting = customerName?.trim()
    ? `Olá, ${customerName.trim()}!`
    : "Olá!";
  const quoteLabel = [quoteNumber, quoteTitle]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" - ");
  const amount =
    typeof totalCents === "number" && totalCents > 0
      ? `Valor: ${formatBRL(totalCents / 100)}.`
      : null;
  const lead =
    mode === "revision"
      ? `Segue a versão revisada ${
          documentKind === "proposal" ? "da proposta" : "do orçamento"
        }${quoteLabel ? ` ${quoteLabel}` : ""} para sua avaliação.`
      : `Segue ${
          documentKind === "proposal" ? "a proposta" : "o orçamento"
        }${quoteLabel ? ` ${quoteLabel}` : ""} para sua avaliação.`;
  const action =
    mode === "revision"
      ? "Acesse o link para revisar, aprovar ou pedir um novo ajuste:"
      : "Acesse o link para ver os detalhes, aprovar ou pedir ajustes:";
  const closing = "Qualquer dúvida, fico à disposição.";

  return [greeting, [lead, amount].filter(Boolean).join("\n"), action, url, closing]
    .filter(Boolean)
    .join("\n\n");
}
