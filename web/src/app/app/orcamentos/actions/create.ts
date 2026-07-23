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
  getBusinessVocabulary,
  normalizeBusinessSegment,
} from "@/lib/business-segment";
import {
  getQuoteTemplate,
  quoteTemplateItemsPayload,
} from "@/lib/quote-templates";
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
    .max(200, "Título muito longo (máx 200 caracteres)")
    .optional()
    .or(z.literal("")),
  template_id: z.string().trim().max(80).optional().or(z.literal("")),
});

interface CreateInput {
  customer_id: string;
  title?: string;
  template_id?: string;
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
  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("plan, business_segment")
    .eq("id", company.company_id)
    .single();

  if (companyError || !companyData) {
    logServerError("quotes.create.company-plan", companyError, {
      company_id: company.company_id,
    });
    return {
      ok: false,
      error:
        "Não foi possível confirmar seu plano agora. Tente novamente em instantes.",
    };
  }

  const businessSegment = normalizeBusinessSegment(
    companyData.business_segment ?? company.company.business_segment,
  );
  const vocabulary = getBusinessVocabulary(businessSegment);
  const requestedTemplateId = parsed.data.template_id || "";
  const template = requestedTemplateId
    ? getQuoteTemplate(requestedTemplateId, businessSegment)
    : null;

  if (requestedTemplateId && !template) {
    return {
      ok: false,
      error: "O modelo escolhido não está disponível para este perfil.",
      fieldErrors: {
        template_id: ["Escolha um modelo disponível ou comece em branco."],
      },
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", parsed.data.customer_id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (customerError) {
    logServerError("quotes.create.customer", customerError);
    return { ok: false, error: clientErrorFor(customerError) };
  }
  if (!customer) {
    return {
      ok: false,
      error: "Cliente não encontrado nesta empresa.",
      fieldErrors: { customer_id: ["Escolha um cliente válido."] },
    };
  }

  if (companyData.plan === "free") {
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
        error: `Você chegou ao limite do Plano Grátis: 3 ${vocabulary.quotePluralLower} neste mês. Assine o Pro para criar ${vocabulary.quotePluralLower} e ${vocabulary.projectPluralLower} sem limite.`,
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

  const validUntilStr = addDaysBR(template?.validDays ?? 15);
  const title =
    parsed.data.title?.trim() ||
    template?.title ||
    vocabulary.newQuoteLabel;

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      company_id: company.company_id,
      customer_id: parsed.data.customer_id,
      number: numberData as string,
      title,
      description: template?.description ?? null,
      notes: template?.notes ?? null,
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

  if (template) {
    const items = quoteTemplateItemsPayload(template).map((item) => ({
      ...item,
      quote_id: data.id as string,
      company_id: company.company_id,
    }));
    const { error: itemsError } = await supabase
      .from("quote_items")
      .insert(items);

    if (itemsError) {
      logServerError("quotes.create.template-items", itemsError, {
        quote_id: data.id as string,
        template_id: template.id,
      });
      const { error: rollbackError } = await supabase
        .from("quotes")
        .delete()
        .eq("id", data.id as string)
        .eq("company_id", company.company_id);
      if (rollbackError) {
        logServerError("quotes.create.template-rollback", rollbackError, {
          quote_id: data.id as string,
        });
      }
      return {
        ok: false,
        error:
          "Não foi possível aplicar o modelo. Tente novamente ou comece em branco.",
      };
    }
  }

  revalidatePath("/app/orcamentos");
  logServerEvent("quotes.created", {
    business_segment: businessSegment,
    company_id: company.company_id,
    quote_id: data.id as string,
    quote_template: template?.id ?? "blank",
    plan: companyData.plan,
  });
  return { ok: true, id: data.id as string };
}

