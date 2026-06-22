"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { generateShareToken, isShareTokenUrlSafe } from "@/lib/quote-token";
import { env } from "@/lib/env";
import { checkSendReadiness } from "@/lib/quote-status";
import { addDaysBR, todayBR } from "@/lib/dates";
import { normalizeQuoteUnit } from "@/lib/format";
import { isValidCpfCnpj, normalizeCpfCnpj } from "@/lib/br-documents";
import { createLocalCharges } from "@/lib/billing/asaas";
import {
  companyPrefersManualPix,
  companyUsesManualPix,
  generatePreferredPixForCharge,
} from "@/lib/billing/provider";
import { entryChargeValidationMessage } from "@/lib/billing/entry-percent";

// ─── Schemas ───────────────────────────────────────────────────────────────

const itemDraftSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Descrição vazia")
    .max(500, "Descrição muito longa (máx 500 caracteres)"),
  unit: z.string().trim().max(10).transform(normalizeQuoteUnit),
  quantity: z
    .number()
    .finite()
    .min(0, "Quantidade não pode ser negativa")
    .max(1_000_000, "Quantidade muito grande"),
  unit_price_cents: z.number().int().min(0).max(1_000_000_000_00),
  catalog_item_id: z.string().uuid().optional().nullable(),
});

const updateQuoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Adicione um título")
    .max(200, "Título muito longo (máx 200 caracteres)"),
  description: z
    .string()
    .trim()
    .max(5000, "Descrição muito longa (máx 5000 caracteres)")
    .optional()
    .or(z.literal("")),
  customer_id: z.string().uuid("Cliente inválido"),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(5000, "Observações muito longas (máx 5000 caracteres)")
    .optional()
    .or(z.literal("")),
  items: z.array(itemDraftSchema).max(200, "Máximo 200 itens por orçamento"),
});

export type QuoteActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function publicQuoteUrl(token: string) {
  return `${env.NEXT_PUBLIC_APP_URL}/q/${token}`;
}

function isMissingRevisionColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string };
  const text = `${err?.message ?? ""} ${err?.details ?? ""}`;
  return (
    err?.code === "42703" ||
    err?.code === "PGRST204" ||
    text.includes("revision_source_id")
  );
}

function isMissingWhatsappSentColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string };
  const text = `${err?.message ?? ""} ${err?.details ?? ""}`;
  return (
    err?.code === "42703" ||
    err?.code === "PGRST204" ||
    text.includes("whatsapp_sent_at")
  );
}

// ─── Send (draft → sent) ────────────────────────────────────────────────────

export type SendQuoteResult =
  | { ok: true; url: string; share_token: string }
  | { ok: false; error: string; blockers?: string[] };

async function replaceShareToken(
  supabase: ReturnType<typeof createClient>,
  id: string,
  companyId: string,
): Promise<SendQuoteResult> {
  const nextToken = generateShareToken();
  const { data, error } = await supabase
    .from("quotes")
    .update({ share_token: nextToken })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("share_token")
    .maybeSingle();

  if (error || !data) {
    logServerError("quotes.share-token.replace", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  const token = (data as { share_token: string | null }).share_token;
  if (!isShareTokenUrlSafe(token)) {
    return { ok: false, error: "Falha ao gerar link compartilhável." };
  }

  return {
    ok: true,
    share_token: token,
    url: publicQuoteUrl(token),
  };
}

/**
 * Marca o orçamento como "sent" e retorna a URL pública pra empreiteiro
 * compartilhar com o cliente.
 *
 * Pre-flight: cliente, validade, ≥1 item, total > 0.
 * Status atual: draft. Se já está sent, retorna a URL existente (idempotente).
 */
export async function sendQuoteAction(id: string): Promise<SendQuoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();

  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select("*, items:quote_items(id)")
    .eq("id", id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (fetchError) {
    logServerError("quotes.send.fetch", fetchError);
    return { ok: false, error: clientErrorFor(fetchError) };
  }
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  const q = quote as unknown as {
    status: string;
    title: string;
    customer_id: string | null;
    valid_until: string | null;
    total_cents: number;
    share_token: string | null;
    items: Array<{ id: string }>;
  };

  // Idempotente: já está enviado → só retorna URL
  if (q.status !== "draft") {
    if (!isShareTokenUrlSafe(q.share_token)) {
      return replaceShareToken(supabase, id, company.company_id);
    }
    return {
      ok: true,
      share_token: q.share_token,
      url: publicQuoteUrl(q.share_token),
    };
  }

  // Pre-flight
  const readiness = checkSendReadiness({
    title: q.title,
    customer_id: q.customer_id,
    valid_until: q.valid_until,
    itemsCount: q.items.length,
    total_cents: q.total_cents,
  });
  if (!readiness.ready) {
    return {
      ok: false,
      error: "Orçamento incompleto. Ajuste antes de enviar.",
      blockers: readiness.blockers,
    };
  }

  const shareToken = isShareTokenUrlSafe(q.share_token)
    ? q.share_token
    : generateShareToken();

  // Marca como enviado e garante share_token URL-safe mesmo se o DB local
  // ainda estiver com default legado em base64.
  const { data: updated, error: updateError } = await supabase
    .from("quotes")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      share_token: shareToken,
    })
    .eq("id", id)
    .eq("company_id", company.company_id)
    .select("share_token")
    .single();

  if (updateError || !updated) {
    logServerError("quotes.send.update", updateError);
    return { ok: false, error: clientErrorFor(updateError) };
  }

  const token = (updated as { share_token: string | null }).share_token;
  if (!isShareTokenUrlSafe(token)) {
    return { ok: false, error: "Falha ao gerar link compartilhável." };
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${id}`);
  return {
    ok: true,
    share_token: token,
    url: publicQuoteUrl(token),
  };
}

