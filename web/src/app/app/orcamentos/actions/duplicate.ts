"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { generateShareToken } from "@/lib/quote-token";
import { addDaysBR } from "@/lib/dates";
import { normalizeQuoteUnit } from "@/lib/format";
import {
  FREE_MONTHLY_QUOTE_LIMIT,
  getFreeQuoteQuotaMonthStart,
} from "@/lib/plans";

// ─── Schemas ───────────────────────────────────────────────────────────────

export type QuoteActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function isMissingRevisionColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string };
  const text = `${err?.message ?? ""} ${err?.details ?? ""}`;
  return (
    err?.code === "42703" ||
    err?.code === "PGRST204" ||
    text.includes("revision_source_id")
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
    const quotaStart = getFreeQuoteQuotaMonthStart();
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.company_id)
      .gte("created_at", quotaStart);

    if (count != null && count >= FREE_MONTHLY_QUOTE_LIMIT) {
      return {
        ok: false,
        error:
          "Você chegou ao limite do Plano Grátis: 3 orçamentos neste mês. Assine o Pro para duplicar e criar orçamentos sem limite.",
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

