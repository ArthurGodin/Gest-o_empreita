"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { normalizeQuoteUnit } from "@/lib/format";

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

  // 2. Chama RPC atômica `replace_quote_items` que:
  //    - Atualiza o header (title/description/customer_id/valid_until/notes/totals)
  //    - Invalida pdf_storage_path e pdf_generated_at (PDF cache)
  //    - DELETE + INSERT dos items numa única transação PL/pgSQL
  // Se qualquer passo falhar, NADA é commitado — sem mais data loss.
  const { error: rpcError } = await supabase.rpc("replace_quote_items", {
    p_quote_id: id,
    p_company_id: company.company_id,
    p_title: parsed.data.title,
    p_description: parsed.data.description || null,
    p_customer_id: parsed.data.customer_id,
    p_valid_until: parsed.data.valid_until || null,
    p_notes: parsed.data.notes || null,
    p_items: parsed.data.items.map((it) => ({
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      unit_price_cents: it.unit_price_cents,
    })),
  });

  if (rpcError) {
    logServerError("quotes.update.rpc", rpcError);
    return { ok: false, error: clientErrorFor(rpcError) };
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${id}`);
  return { ok: true, id };
}

