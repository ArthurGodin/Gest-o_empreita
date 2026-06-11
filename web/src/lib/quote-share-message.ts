import { formatBRL } from "./utils";

export type QuoteShareMessageMode = "quote" | "revision";

interface QuoteWhatsappMessageInput {
  customerName?: string | null;
  quoteNumber?: string | null;
  quoteTitle?: string | null;
  totalCents?: number | null;
  url: string;
  mode?: QuoteShareMessageMode;
}

export function buildQuoteWhatsappMessage({
  customerName,
  quoteNumber,
  quoteTitle,
  totalCents,
  url,
  mode = "quote",
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
      ? `Segue a versão revisada do orçamento${quoteLabel ? ` ${quoteLabel}` : ""} para sua avaliação.`
      : `Segue o orçamento${quoteLabel ? ` ${quoteLabel}` : ""} para sua avaliação.`;
  const action =
    mode === "revision"
      ? "Acesse o link para revisar, aprovar ou pedir um novo ajuste:"
      : "Acesse o link para ver os detalhes, aprovar ou pedir ajustes:";
  const closing = "Qualquer dúvida, fico à disposição.";

  return [greeting, [lead, amount].filter(Boolean).join("\n"), action, url, closing]
    .filter(Boolean)
    .join("\n\n");
}
