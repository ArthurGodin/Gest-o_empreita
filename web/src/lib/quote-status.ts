/**
 * State machine helpers para o status do orçamento.
 *
 * Status fonte-de-verdade no DB: draft | sent | viewed | approved | rejected
 * Status derivado em runtime: expired (quando sent/viewed + valid_until passou)
 *
 * Não temos cron pra setar `expired` no DB — calculamos dinamicamente nas
 * queries. Mais simples e correto.
 */

import type { QuoteStatus } from "@/lib/supabase/types";

export type EffectiveQuoteStatus = QuoteStatus | "expired";

export interface QuoteStatusInput {
  status: QuoteStatus;
  valid_until: string | null;
}

/**
 * Calcula o status efetivo considerando expiração.
 * Aceita Date ou ISO string em valid_until.
 */
export function effectiveStatus(
  quote: QuoteStatusInput,
  now: Date = new Date(),
): EffectiveQuoteStatus {
  if (
    (quote.status === "sent" || quote.status === "viewed") &&
    quote.valid_until &&
    new Date(quote.valid_until) < startOfDay(now)
  ) {
    return "expired";
  }
  return quote.status;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Status que permitem edição no editor.
 * `draft` é o único editável; outros são read-only (precisa duplicar pra mudar).
 */
export function isEditable(status: QuoteStatus): boolean {
  return status === "draft";
}

/**
 * Status onde o link público mostra o formulário de aprovação.
 */
export function canApprove(effective: EffectiveQuoteStatus): boolean {
  return effective === "sent" || effective === "viewed";
}

/**
 * Status onde o botão "Virar obra" aparece no editor.
 */
export function canConvertToProject(
  effective: EffectiveQuoteStatus,
  projectId: string | null,
): boolean {
  return effective === "approved" && !projectId;
}

/**
 * Validações pré-envio: orçamento precisa ter título, cliente, validade e ≥1 item.
 */
export interface QuoteSendReadiness {
  ready: boolean;
  blockers: string[];
}

export function checkSendReadiness(input: {
  title: string;
  customer_id: string | null;
  valid_until: string | null;
  itemsCount: number;
  total_cents: number;
}): QuoteSendReadiness {
  const blockers: string[] = [];
  if (!input.title.trim()) blockers.push("Adicione um título");
  if (!input.customer_id) blockers.push("Escolha um cliente");
  if (!input.valid_until) blockers.push("Defina a validade do orçamento");
  if (input.itemsCount === 0) blockers.push("Adicione ao menos 1 item");
  if (input.total_cents <= 0) blockers.push("Total precisa ser maior que zero");
  return { ready: blockers.length === 0, blockers };
}

/**
 * Mapa de labels PT-BR pra exibição.
 */
export const STATUS_LABEL: Record<EffectiveQuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  viewed: "Visto pelo cliente",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
};

/**
 * Cores semânticas por status (Tailwind tokens). Usado em badges.
 */
export const STATUS_COLOR: Record<
  EffectiveQuoteStatus,
  "neutral" | "blue" | "amber" | "green" | "red" | "gray"
> = {
  draft: "neutral",
  sent: "blue",
  viewed: "amber",
  approved: "green",
  rejected: "red",
  expired: "gray",
};
