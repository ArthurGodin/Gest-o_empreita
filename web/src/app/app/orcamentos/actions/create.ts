"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import {
  clientErrorFor,
  logServerError,
  logServerEvent,
  logServerWarning,
} from "@/lib/log";
import { generateShareToken } from "@/lib/quote-token";
import { addDaysBR } from "@/lib/dates";
import {
  FREE_MONTHLY_QUOTE_LIMIT,
  getFreeQuoteQuotaMonthStart,
} from "@/lib/plans";

// ─── Schemas ───────────────────────────────────────────────────────────────

export type QuoteActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Create ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  customer_id: z.string().uuid("Cliente inválido"),
  title: z
    .string()
    .trim()
    .min(1)
    .max(200, "Título muito longo (máx 200 caracteres)")
    .default("Novo orçamento"),
});

interface CreateInput {
  customer_id: string;
  title?: string;
}

/**
 * Cria um novo orçamento em status `draft` com numeração automática
 * (ORC-YYYY-NNNN). Não cria item inicial — usuário adiciona no editor.
 *
 * Validade default: 15 dias a partir de hoje.
 */
export async function createQuoteAction(
  input: CreateInput,
): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

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
      logServerWarning("quotes.free_limit_reached", {
        company_id: company.company_id,
        limit: FREE_MONTHLY_QUOTE_LIMIT,
        quotes_count_this_month: count,
        quota_start: quotaStart,
      });
      return {
        ok: false,
        error:
          "Você chegou ao limite do Plano Grátis: 3 orçamentos neste mês. Assine o Pro para criar orçamentos e obras sem limite.",
      };
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Numeração atômica via SECURITY DEFINER function
  const { data: numberData, error: numberError } = await supabase.rpc(
    "next_quote_number",
    { p_company_id: company.company_id },
  );

  if (numberError || !numberData) {
    logServerError("quotes.next-number", numberError);
    return { ok: false, error: clientErrorFor(numberError) };
  }

  const validUntilStr = addDaysBR(15);

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      company_id: company.company_id,
      customer_id: parsed.data.customer_id,
      number: numberData as string,
      title: parsed.data.title ?? "Novo orçamento",
      status: "draft",
      valid_until: validUntilStr,
      share_token: generateShareToken(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("quotes.create", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/app/orcamentos");
  logServerEvent("quotes.created", {
    company_id: company.company_id,
    quote_id: data.id as string,
    plan: companyData?.plan ?? "unknown",
  });
  return { ok: true, id: data.id as string };
}

