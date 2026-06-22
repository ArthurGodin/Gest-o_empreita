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

// ─── Revoke share token (gera novo) ────────────────────────────────────────

import { type SendQuoteResult } from "./send";

export async function revokeShareTokenAction(id: string): Promise<SendQuoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();
  const newToken = generateShareToken();

  const { data, error } = await supabase
    .from("quotes")
    .update({ share_token: newToken })
    .eq("id", id)
    .eq("company_id", company.company_id)
    .select("share_token")
    .maybeSingle();

  if (error) {
    logServerError("quotes.revoke-token", error);
    return { ok: false, error: clientErrorFor(error) };
  }
  if (!data) return { ok: false, error: "Orçamento não encontrado." };

  const token = (data as { share_token: string }).share_token;
  revalidatePath(`/app/orcamentos/${id}`);
  return {
    ok: true,
    share_token: token,
    url: publicQuoteUrl(token),
  };
}

export type MarkQuoteWhatsappSentResult =
  | { ok: true; sent_at: string }
  | { ok: false; error: string };

export async function markQuoteWhatsappSentAction(
  id: string,
): Promise<MarkQuoteWhatsappSentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const sentAt = new Date().toISOString();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .update({ whatsapp_sent_at: sentAt })
    .eq("id", id)
    .eq("company_id", company.company_id)
    .select("id")
    .maybeSingle();

  if (error) {
    logServerError("quotes.whatsapp-sent", error);
    if (isMissingWhatsappSentColumn(error)) {
      return {
        ok: false,
        error:
          "WhatsApp aberto. Para salvar o histórico de envio, aplique a migration 20260612000001_quote_whatsapp_sent_at.sql no Supabase.",
      };
    }
    return { ok: false, error: clientErrorFor(error) };
  }
  if (!data) return { ok: false, error: "Orçamento não encontrado." };

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${id}`);
  return { ok: true, sent_at: sentAt };
}

