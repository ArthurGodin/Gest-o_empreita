import { formatBRL } from "./utils";

interface QuoteWhatsappMessageInput {
  customerName?: string | null;
  quoteNumber?: string | null;
  quoteTitle?: string | null;
  totalCents?: number | null;
  url: string;
}

export function buildQuoteWhatsappMessage({
  customerName,
  quoteNumber,
  quoteTitle,
  totalCents,
  url,
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

  return [
    greeting,
    `Segue o orçamento${quoteLabel ? ` ${quoteLabel}` : ""} para você avaliar.`,
    amount,
    "Você pode ver, aprovar ou pedir mudanças pelo link:",
    url,
  ]
    .filter(Boolean)
    .join(" ");
}
