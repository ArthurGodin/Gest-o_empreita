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
      ? `Segue a versão revisada do orçamento${quoteLabel ? ` ${quoteLabel}` : ""} para você avaliar.`
      : `Segue o orçamento${quoteLabel ? ` ${quoteLabel}` : ""} para você avaliar.`;
  const action =
    mode === "revision"
      ? "Você pode revisar, aprovar ou pedir um novo ajuste pelo link:"
      : "Você pode ver, aprovar ou pedir mudanças pelo link:";

  return [greeting, lead, amount, action, url].filter(Boolean).join(" ");
}
