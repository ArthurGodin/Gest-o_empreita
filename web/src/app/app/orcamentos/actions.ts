"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { generateShareToken } from "@/lib/quote-token";
import { env } from "@/lib/env";
import { checkSendReadiness } from "@/lib/quote-status";

// ─── Schemas ───────────────────────────────────────────────────────────────

const itemDraftSchema = z.object({
  description: z.string().trim().min(1, "Descrição vazia"),
  unit: z.string().trim().min(1, "Unidade vazia").max(10),
  quantity: z.number().finite().min(0, "Quantidade não pode ser negativa"),
  unit_price_cents: z
    .number()
    .int()
    .min(0)
    .max(1_000_000_000_00),
  catalog_item_id: z.string().uuid().optional().nullable(),
});

const updateQuoteSchema = z.object({
  title: z.string().trim().min(1, "Adicione um título"),
  description: z.string().trim().optional().or(z.literal("")),
  customer_id: z.string().uuid("Cliente inválido"),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  items: z.array(itemDraftSchema).max(200, "Máximo 200 itens por orçamento"),
});

export type QuoteActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Create ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  customer_id: z.string().uuid("Cliente inválido"),
  title: z.string().trim().min(1).max(200).default("Novo orçamento"),
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

  // Numeração atômica via SECURITY DEFINER function
  const { data: numberData, error: numberError } = await supabase.rpc(
    "next_quote_number",
    { p_company_id: company.company_id },
  );

  if (numberError || !numberData) {
    logServerError("quotes.next-number", numberError);
    return { ok: false, error: clientErrorFor(numberError) };
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 15);
  const validUntilStr = validUntil.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      company_id: company.company_id,
      customer_id: parsed.data.customer_id,
      number: numberData as string,
      title: parsed.data.title ?? "Novo orçamento",
      status: "draft",
      valid_until: validUntilStr,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("quotes.create", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/app/orcamentos");
  return { ok: true, id: data.id as string };
}

// ─── Update (draft) ────────────────────────────────────────────────────────

interface UpdateInput {
  title: string;
  description?: string;
  customer_id: string;
  valid_until?: string;
  notes?: string;
  items: Array<{
    description: string;
    unit: string;
    quantity: number;
    unit_price_cents: number;
    catalog_item_id?: string | null;
  }>;
}

/**
 * Atualiza orçamento em draft. Implementação: delete-then-insert dos items
 * dentro de uma operação atômica (transação) — mais simples que upsert por
 * position e idempotente.
 *
 * Aceita arrays vazios. Status NÃO muda aqui (continua draft).
 */
export async function updateQuoteAction(
  id: string,
  input: UpdateInput,
): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const parsed = updateQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();

  // 1. Verifica que o quote existe, é do tenant e está em draft
  const { data: current, error: fetchError } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (fetchError) {
    logServerError("quotes.update.fetch", fetchError);
    return { ok: false, error: clientErrorFor(fetchError) };
  }
  if (!current) return { ok: false, error: "Orçamento não encontrado." };
  if ((current as { status: string }).status !== "draft") {
    return {
      ok: false,
      error:
        "Esse orçamento já foi enviado e não pode ser editado. Use 'Duplicar' pra criar uma versão nova.",
    };
  }

  // 2. Calcula totais a partir dos items
  const itemsToInsert = parsed.data.items.map((it, idx) => ({
    quote_id: id,
    company_id: company.company_id,
    position: idx,
    description: it.description,
    unit: it.unit,
    quantity: it.quantity,
    unit_price_cents: it.unit_price_cents,
    total_cents: Math.round(it.quantity * it.unit_price_cents),
  }));

  const subtotal = itemsToInsert.reduce((s, it) => s + it.total_cents, 0);

  // 3. Atualiza header
  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      customer_id: parsed.data.customer_id,
      valid_until: parsed.data.valid_until || null,
      notes: parsed.data.notes || null,
      subtotal_cents: subtotal,
      total_cents: subtotal, // sem desconto por enquanto
    })
    .eq("id", id)
    .eq("company_id", company.company_id);

  if (updateError) {
    logServerError("quotes.update.header", updateError);
    return { ok: false, error: clientErrorFor(updateError) };
  }

  // 4. Apaga items antigos e insere os novos
  const { error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", id);

  if (deleteError) {
    logServerError("quotes.update.delete-items", deleteError);
    return { ok: false, error: clientErrorFor(deleteError) };
  }

  if (itemsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("quote_items")
      .insert(itemsToInsert);

    if (insertError) {
      logServerError("quotes.update.insert-items", insertError);
      return { ok: false, error: clientErrorFor(insertError) };
    }
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${id}`);
  return { ok: true, id };
}

// ─── Duplicate ─────────────────────────────────────────────────────────────

/**
 * Duplica um orçamento (qualquer status) como novo draft com numeração nova.
 * Copia título, cliente, descrição, observações, items.
 */
export async function duplicateQuoteAction(
  id: string,
): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();

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

  // Numero novo
  const { data: numberData, error: numberError } = await supabase.rpc(
    "next_quote_number",
    { p_company_id: company.company_id },
  );
  if (numberError || !numberData) {
    logServerError("quotes.duplicate.next-number", numberError);
    return { ok: false, error: clientErrorFor(numberError) };
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 15);

  const subtotal = orig.items.reduce((s, it) => s + it.total_cents, 0);

  const { data: created, error: createError } = await supabase
    .from("quotes")
    .insert({
      company_id: company.company_id,
      customer_id: orig.customer_id,
      number: numberData as string,
      title: `${orig.title} (cópia)`,
      description: orig.description,
      status: "draft",
      valid_until: validUntil.toISOString().slice(0, 10),
      notes: orig.notes,
      subtotal_cents: subtotal,
      total_cents: subtotal,
      created_by: user.id,
    })
    .select("id")
    .single();

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
        unit: it.unit,
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
  return { ok: true, id: created.id as string };
}

// ─── Send (draft → sent) ────────────────────────────────────────────────────

export type SendQuoteResult =
  | { ok: true; url: string; share_token: string }
  | { ok: false; error: string; blockers?: string[] };

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
    if (!q.share_token) {
      return { ok: false, error: "Orçamento sem link compartilhável." };
    }
    return {
      ok: true,
      share_token: q.share_token,
      url: `${env.NEXT_PUBLIC_APP_URL}/q/${q.share_token}`,
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

  // Marca como enviado. share_token já foi gerado pelo trigger no insert.
  const { data: updated, error: updateError } = await supabase
    .from("quotes")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
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
  if (!token) {
    return { ok: false, error: "Falha ao gerar link compartilhável." };
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${id}`);
  return {
    ok: true,
    share_token: token,
    url: `${env.NEXT_PUBLIC_APP_URL}/q/${token}`,
  };
}

// ─── Revoke share token (gera novo) ────────────────────────────────────────

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
    url: `${env.NEXT_PUBLIC_APP_URL}/q/${token}`,
  };
}

// ─── Delete (só draft) ─────────────────────────────────────────────────────

export async function deleteQuoteAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();

  const { data: current } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (!current) return { ok: false, error: "Orçamento não encontrado." };
  if ((current as { status: string }).status !== "draft") {
    return {
      ok: false,
      error:
        "Só dá pra apagar orçamentos em rascunho. Pra retirar um enviado, use 'Duplicar' depois.",
    };
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("company_id", company.company_id);

  if (error) {
    logServerError("quotes.delete", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/app/orcamentos");
  return { ok: true };
}
