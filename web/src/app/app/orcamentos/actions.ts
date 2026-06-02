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
import {
  createLocalCharges,
  generatePixForCharge,
  isValidCpfCnpjLength,
  normalizeCpfCnpj,
} from "@/lib/billing/asaas";

// ─── Schemas ───────────────────────────────────────────────────────────────

const itemDraftSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Descrição vazia")
    .max(500, "Descrição muito longa (máx 500 caracteres)"),
  unit: z.string().trim().min(1, "Unidade vazia").max(10),
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
      unit: it.unit || "un",
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
      valid_until: addDaysBR(15),
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
    url: publicQuoteUrl(token),
  };
}

// ─── Convert approved quote → project ──────────────────────────────────────

export type ConvertToProjectResult =
  | { ok: true; project_id: string; billing_warning?: string }
  | { ok: false; error: string };

type ConvertOptions =
  | string
  | null
  | {
      templateId?: string | null;
      entryPct?: number;
      cpfCnpj?: string | null;
    };

/**
 * Cria um `projects` row a partir de um orçamento aprovado e linka via
 * `quotes.project_id`. Idempotente — se já tem project_id, retorna o existente.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _unusedConvertToProjectActionLegacy(
  quoteId: string,
  templateId?: string | null,
): Promise<ConvertToProjectResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  if (templateId && !/^[0-9a-fA-F-]{36}$/.test(templateId)) {
    return { ok: false, error: "Template inválido." };
  }

  const supabase = createClient();

  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select(
      "id, status, project_id, customer_id, title, total_cents, customer:customers(address)",
    )
    .eq("id", quoteId)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (fetchError) {
    logServerError("quotes.convert.fetch", fetchError);
    return { ok: false, error: clientErrorFor(fetchError) };
  }
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  const q = quote as unknown as {
    id: string;
    status: string;
    project_id: string | null;
    customer_id: string;
    title: string;
    total_cents: number;
    customer: { address: string | null } | null;
  };

  if (q.status !== "approved") {
    return {
      ok: false,
      error: "Só dá pra virar obra um orçamento aprovado pelo cliente.",
    };
  }

  if (q.project_id) {
    return { ok: true, project_id: q.project_id };
  }

  const { data: project, error: createError } = await supabase
    .from("projects")
    .insert({
      company_id: company.company_id,
      customer_id: q.customer_id,
      name: q.title,
      address: q.customer?.address ?? null,
      status: "planning",
      starts_on: todayBR(),
      budget_cents: q.total_cents,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (createError || !project) {
    logServerError("quotes.convert.create-project", createError);
    return { ok: false, error: clientErrorFor(createError) };
  }

  const projectId = project.id as string;

  // Link com guarda atômica: só atualiza se quote.project_id AINDA é null.
  // Se outra request concorrente já linkou, NOSSO update afeta 0 linhas e
  // sabemos que precisa rollback (delete da project órfã).
  const { data: linked, error: linkError } = await supabase
    .from("quotes")
    .update({ project_id: projectId })
    .eq("id", quoteId)
    .eq("company_id", company.company_id)
    .is("project_id", null)
    .select("id")
    .maybeSingle();

  if (linkError) {
    logServerError("quotes.convert.link", linkError);
    // Tenta limpar orphan; falha silenciosa (orphan será limpo no GC futuro)
    await supabase.from("projects").delete().eq("id", projectId);
    return { ok: false, error: clientErrorFor(linkError) };
  }

  if (!linked) {
    // Outra request concorrente venceu — apaga nossa project órfã e retorna a que venceu
    await supabase.from("projects").delete().eq("id", projectId);
    const { data: winner } = await supabase
      .from("quotes")
      .select("project_id")
      .eq("id", quoteId)
      .eq("company_id", company.company_id)
      .maybeSingle();
    const winnerId = (winner as { project_id: string | null } | null)?.project_id;
    if (winnerId) return { ok: true, project_id: winnerId };
    return { ok: false, error: "Não foi possível criar a obra. Tente novamente." };
  }

  // Instancia etapas do template (se informado). Falha aqui NÃO desfaz o
  // projeto — o usuário pode aplicar template manualmente depois.
  if (templateId) {
    const { error: tplErr } = await supabase.rpc(
      "instantiate_template_stages",
      {
        p_project_id: projectId,
        p_company_id: company.company_id,
        p_template_id: templateId,
      },
    );
    if (tplErr) {
      logServerError("quotes.convert.apply-template", tplErr);
      // Segue mesmo assim — usuário aplica depois
    }
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${quoteId}`);
  revalidatePath("/app/obras");
  return { ok: true, project_id: projectId };
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

export async function convertToProjectAction(
  quoteId: string,
  options?: ConvertOptions,
): Promise<ConvertToProjectResult> {
  const normalizedOptions =
    typeof options === "object" && options !== null
      ? options
      : { templateId: options };
  const templateId = normalizedOptions.templateId ?? null;
  const entryPct = normalizedOptions.entryPct ?? 30;
  const cpfCnpj = normalizeCpfCnpj(normalizedOptions.cpfCnpj);

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  if (templateId && !/^[0-9a-fA-F-]{36}$/.test(templateId)) {
    return { ok: false, error: "Template inválido." };
  }
  if (!Number.isFinite(entryPct) || entryPct < 0 || entryPct > 100) {
    return { ok: false, error: "Entrada deve ficar entre 0% e 100%." };
  }

  const supabase = createClient();
  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select(
      "id, status, project_id, customer_id, title, total_cents, customer:customers(id, name, document, phone, email, address)",
    )
    .eq("id", quoteId)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (fetchError) {
    logServerError("quotes.convert.fetch", fetchError);
    return { ok: false, error: clientErrorFor(fetchError) };
  }
  if (!quote) return { ok: false, error: "Orçamento não encontrado." };

  const q = quote as unknown as {
    id: string;
    status: string;
    project_id: string | null;
    customer_id: string;
    title: string;
    total_cents: number;
    customer: {
      id: string;
      name: string;
      document: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
    } | null;
  };

  if (q.status !== "approved") {
    return {
      ok: false,
      error: "Só dá pra virar obra um orçamento aprovado pelo cliente.",
    };
  }
  if (q.project_id) return { ok: true, project_id: q.project_id };
  if (!q.customer) return { ok: false, error: "Cliente não encontrado." };

  if (entryPct > 0 && !isValidCpfCnpjLength(cpfCnpj || q.customer.document)) {
    return {
      ok: false,
      error: "Informe CPF/CNPJ do cliente para gerar a cobrança Pix.",
    };
  }

  const { data: project, error: createError } = await supabase
    .from("projects")
    .insert({
      company_id: company.company_id,
      customer_id: q.customer_id,
      name: q.title,
      address: q.customer.address,
      status: "planning",
      starts_on: todayBR(),
      budget_cents: q.total_cents,
      entry_pct: entryPct,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (createError || !project) {
    logServerError("quotes.convert.create-project", createError);
    return { ok: false, error: clientErrorFor(createError) };
  }

  const projectId = project.id as string;
  const { data: linked, error: linkError } = await supabase
    .from("quotes")
    .update({ project_id: projectId })
    .eq("id", quoteId)
    .eq("company_id", company.company_id)
    .is("project_id", null)
    .select("id")
    .maybeSingle();

  if (linkError) {
    logServerError("quotes.convert.link", linkError);
    await supabase.from("projects").delete().eq("id", projectId);
    return { ok: false, error: clientErrorFor(linkError) };
  }

  if (!linked) {
    await supabase.from("projects").delete().eq("id", projectId);
    const { data: winner } = await supabase
      .from("quotes")
      .select("project_id")
      .eq("id", quoteId)
      .eq("company_id", company.company_id)
      .maybeSingle();
    const winnerId = (winner as { project_id: string | null } | null)?.project_id;
    if (winnerId) return { ok: true, project_id: winnerId };
    return { ok: false, error: "Não foi possível criar a obra. Tente novamente." };
  }

  if (templateId) {
    const { error: tplErr } = await supabase.rpc("instantiate_template_stages", {
      p_project_id: projectId,
      p_company_id: company.company_id,
      p_template_id: templateId,
    });
    if (tplErr) logServerError("quotes.convert.apply-template", tplErr);
  }

  let billingWarning: string | undefined;
  try {
    if (cpfCnpj && !q.customer.document) {
      await supabase
        .from("customers")
        .update({ document: cpfCnpj })
        .eq("id", q.customer_id)
        .eq("company_id", company.company_id);
      q.customer.document = cpfCnpj;
    }

    const charges = await createLocalCharges(supabase, {
      projectId,
      companyId: company.company_id,
      customerId: q.customer_id,
      totalCents: q.total_cents,
      entryPct,
    });

    if (charges.entryChargeId) {
      const pix = await generatePixForCharge(supabase, {
        chargeId: charges.entryChargeId,
        companyId: company.company_id,
        customer: q.customer,
        cpfCnpjOverride: cpfCnpj,
        description: `Entrada - ${q.title}`,
      });
      billingWarning = pix.warning;
    }
  } catch (billingError) {
    logServerError("quotes.convert.billing", billingError);
    billingWarning =
      "Obra criada, mas a cobrança Pix ficou pendente. Gere a cobrança no painel da obra.";
  }

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${quoteId}`);
  revalidatePath("/app/obras");
  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true, project_id: projectId, billing_warning: billingWarning };
}
