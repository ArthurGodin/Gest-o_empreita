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

// ─── Duplicate ─────────────────────────────────────────────────────────────

/**
 * Duplica um orçamento (qualquer status) como novo draft com numeração nova.
 * Copia título, cliente, descrição, observações, items.
 */
export async function duplicateQuoteAction(
  id: string,
  options: { intent?: "copy" | "revision" } = {},
): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();

  // ─── Paywall (Soft Limit) ──────────────────────────────────────────────────
  const { data: companyData } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", company.company_id)
    .single();

  if (companyData?.plan === "free") {
    const FREE_MAX_QUOTES = 5;
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.company_id);

    if (count != null && count >= FREE_MAX_QUOTES) {
      return {
        ok: false,
        error: "Limite atingido! O plano Grátis permite até 5 orçamentos. Faça o upgrade para duplicar e criar orçamentos ilimitados.",
      };
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Busca o original (com items)
  const { data: original, error: fetchError } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (fetchError) {
    logServerError("quotes.duplicate.fetch", fetchError);
    return { ok: false, error: clientErrorFor(fetchError) };
  }
  if (!original) return { ok: false, error: "Orçamento não encontrado." };

  const orig = original as unknown as {
    status: string;
    title: string;
    description: string | null;
    customer_id: string;
    notes: string | null;
    items: Array<{
      description: string;
      unit: string;
      quantity: number;
      unit_price_cents: number;
      total_cents: number;
    }>;
  };

  if (options.intent === "revision" && orig.status !== "rejected") {
    return {
      ok: false,
      error: "Só dá para criar revisão de orçamento recusado pelo cliente.",
    };
  }

  // Numero novo
  const { data: numberData, error: numberError } = await supabase.rpc(
    "next_quote_number",
    { p_company_id: company.company_id },
  );
  if (numberError || !numberData) {
    logServerError("quotes.duplicate.next-number", numberError);
    return { ok: false, error: clientErrorFor(numberError) };
  }

  const subtotal = orig.items.reduce((s, it) => s + it.total_cents, 0);
  const nextTitle =
    options.intent === "revision"
      ? revisionQuoteTitle(orig.title)
      : copyQuoteTitle(orig.title);

  const baseInsert = {
    company_id: company.company_id,
    customer_id: orig.customer_id,
    number: numberData as string,
    title: nextTitle,
    description: orig.description,
    status: "draft",
    valid_until: addDaysBR(15),
    share_token: generateShareToken(),
    notes: orig.notes,
    subtotal_cents: subtotal,
    total_cents: subtotal,
    created_by: user.id,
  } as const;
  const insertPayload =
    options.intent === "revision"
      ? { ...baseInsert, revision_source_id: id }
      : baseInsert;

  let { data: created, error: createError } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single();

  if (
    createError &&
    options.intent === "revision" &&
    isMissingRevisionColumn(createError)
  ) {
    const retry = await supabase
      .from("quotes")
      .insert(baseInsert)
      .select("id")
      .single();
    created = retry.data;
    createError = retry.error;
  }

  if (createError || !created) {
    logServerError("quotes.duplicate.create", createError);
    return { ok: false, error: clientErrorFor(createError) };
  }

  if (orig.items.length > 0) {
    const newId = created.id as string;
    const { error: itemsError } = await supabase.from("quote_items").insert(
      orig.items.map((it, idx) => ({
        quote_id: newId,
        company_id: company.company_id,
        position: idx,
        description: it.description,
        unit: normalizeQuoteUnit(it.unit),
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        total_cents: it.total_cents,
      })),
    );
    if (itemsError) {
      logServerError("quotes.duplicate.items", itemsError);
      // Não rollback — o quote duplicado fica sem items, user pode editar
    }
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${id}`);
  return { ok: true, id: created.id as string };
}

function copyQuoteTitle(title: string): string {
  const clean = title.trim() || "Orçamento";
  return clean.endsWith("(cópia)") ? clean : `${clean} (cópia)`;
}

function revisionQuoteTitle(title: string): string {
  const clean = title
    .replace(/\s+\(c[óo]pia\)$/i, "")
    .replace(/\s+-\s+revis[aã]o$/i, "")
    .trim();
  return `${clean || "Orçamento"} - revisão`;
}

