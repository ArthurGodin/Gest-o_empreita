"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeBrazilStateCode } from "@/lib/brazil-states";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { suggestCatalogItems, type CatalogItem } from "@/lib/queries/catalog";
import { clientErrorFor, logServerError } from "@/lib/log";
import { normalizeQuoteUnit } from "@/lib/format";
import type {
  QuoteItemSuggestion,
  QuoteItemSuggestionResult,
  SinapiSuggestionStatus,
} from "@/lib/quote-item-suggestions";
import {
  CATALOG_IMPORT_MAX_ROWS,
  type CatalogImportError,
  parseCatalogCsv,
} from "@/lib/catalog-import";

const itemSchema = z.object({
  description: z.string().trim().min(2, "Descrição precisa ter pelo menos 2 caracteres"),
  unit: z.string().trim().max(10, "Unidade até 10 caracteres").transform(normalizeQuoteUnit),
  default_price_cents: z
    .number()
    .int()
    .min(0, "Preço não pode ser negativo")
    .max(1_000_000_000_00, "Preço máximo R$ 1 bilhão"),
});

export type CatalogActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type CatalogImportActionResult =
  | {
      ok: true;
      inserted: number;
      updated: number;
      ignored: number;
      invalid: number;
      errors: CatalogImportError[];
    }
  | {
      ok: false;
      error: string;
      errors?: CatalogImportError[];
    };

interface CreateInput {
  description: string;
  unit: string;
  default_price_cents: number;
}

export async function createCatalogItemAction(
  input: CreateInput,
): Promise<CatalogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login." };

  const company = await getActiveCompany();
  if (!company) {
    return { ok: false, error: "Você ainda não tem empresa cadastrada." };
  }

  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      ...parsed.data,
      company_id: company.company_id,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("catalog.create", error);
    // 23505 = unique violation — descrição já existe (case-insensitive)
    if ((error as { code?: string })?.code === "23505") {
      return {
        ok: false,
        error: "Você já tem um item com essa descrição no catálogo.",
      };
    }
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/app/catalogo");
  return { ok: true, id: data.id as string };
}

export async function updateCatalogItemAction(
  id: string,
  input: CreateInput,
): Promise<CatalogActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .update(parsed.data)
    .eq("id", id)
    .eq("company_id", company.company_id)
    .select("id")
    .maybeSingle();

  if (error) {
    logServerError("catalog.update", error);
    if ((error as { code?: string })?.code === "23505") {
      return {
        ok: false,
        error: "Você já tem um item com essa descrição no catálogo.",
      };
    }
    return { ok: false, error: clientErrorFor(error) };
  }
  if (!data) return { ok: false, error: "Item não encontrado." };

  revalidatePath("/app/catalogo");
  return { ok: true, id: data.id as string };
}

export async function deleteCatalogItemAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .delete()
    .eq("id", id)
    .eq("company_id", company.company_id)
    .select("id")
    .maybeSingle();

  if (error) {
    logServerError("catalog.delete", error);
    return { ok: false, error: clientErrorFor(error) };
  }
  if (!data) return { ok: false, error: "Item não encontrado." };

  revalidatePath("/app/catalogo");
  return { ok: true };
}

export async function importCatalogCsvAction(
  formData: FormData,
): Promise<CatalogImportActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", company.company_id)
    .single();

  if (companyError) {
    logServerError("catalog.import.company", companyError);
    return { ok: false, error: clientErrorFor(companyError) };
  }

  if (companyData?.plan !== "ultimate") {
    return {
      ok: false,
      error:
        "Importar catálogo por CSV é uma funcionalidade do plano Ultimate. O catálogo manual continua disponível no seu plano atual.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Selecione um arquivo CSV para importar." };
  }

  if (file.size === 0) {
    return { ok: false, error: "O arquivo selecionado esta vazio." };
  }

  if (file.size > 1024 * 1024) {
    return {
      ok: false,
      error: "Arquivo muito grande. Importe até 1 MB por vez.",
    };
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".csv") && file.type && !file.type.includes("csv")) {
    return {
      ok: false,
      error: "Por enquanto a importação aceita CSV. Baixe o modelo e salve seu arquivo nesse formato.",
    };
  }

  const text = await file.text();
  const parsed = parseCatalogCsv(text, { maxRows: CATALOG_IMPORT_MAX_ROWS });

  if (parsed.rows.length === 0) {
    return {
      ok: false,
      error:
        parsed.errors[0]?.message ??
        "Nenhum item válido encontrado no arquivo.",
      errors: parsed.errors,
    };
  }

  const uniqueRows = new Map<string, (typeof parsed.rows)[number]>();
  let duplicatedInFile = 0;

  for (const row of parsed.rows) {
    const key = normalizeCatalogKey(row.description);
    if (uniqueRows.has(key)) duplicatedInFile += 1;
    uniqueRows.set(key, row);
  }

  const { data: existing, error: existingError } = await supabase
    .from("catalog_items")
    .select("id, description")
    .eq("company_id", company.company_id);

  if (existingError) {
    logServerError("catalog.import.existing", existingError);
    return { ok: false, error: clientErrorFor(existingError) };
  }

  const existingByDescription = new Map(
    (existing ?? []).map((item) => [
      normalizeCatalogKey((item as { description: string }).description),
      (item as { id: string }).id,
    ]),
  );

  const inserts: Array<{
    company_id: string;
    description: string;
    unit: string;
    default_price_cents: number;
  }> = [];
  const updates: Array<{
    id: string;
    description: string;
    unit: string;
    default_price_cents: number;
    sourceRow: number;
  }> = [];

  for (const [key, row] of uniqueRows.entries()) {
    const existingId = existingByDescription.get(key);
    if (existingId) {
      updates.push({ id: existingId, ...row });
    } else {
      inserts.push({
        company_id: company.company_id,
        description: row.description,
        unit: row.unit,
        default_price_cents: row.default_price_cents,
      });
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from("catalog_items")
      .insert(inserts);

    if (insertError) {
      logServerError("catalog.import.insert", insertError);
      return { ok: false, error: clientErrorFor(insertError) };
    }
  }

  const updateErrors: CatalogImportError[] = [];
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("catalog_items")
      .update({
        description: update.description,
        unit: update.unit,
        default_price_cents: update.default_price_cents,
      })
      .eq("id", update.id)
      .eq("company_id", company.company_id);

    if (updateError) {
      logServerError("catalog.import.update", updateError);
      updateErrors.push({
        row: update.sourceRow,
        message: "Não foi possível atualizar este item.",
      });
    }
  }

  revalidatePath("/app/catalogo");

  return {
    ok: true,
    inserted: inserts.length,
    updated: updates.length - updateErrors.length,
    ignored: parsed.ignoredRows + duplicatedInFile,
    invalid: parsed.errors.length + updateErrors.length,
    errors: [...parsed.errors, ...updateErrors].slice(0, 12),
  };
}

/**
 * Incrementa usage_count e atualiza last_used_at quando um item do catálogo
 * é selecionado no editor de orçamento. Best-effort — falha silenciosa.
 *
 * Implementação read-then-write (não-atômica). Como usage_count é só um
 * sinal de relevância pro autocomplete (não dinheiro nem segurança),
 * race conditions ocasionalmente perdendo +1 são aceitáveis.
 */
export async function recordCatalogUsageAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const company = await getActiveCompany();
  if (!company) return;

  const supabase = createClient();

  const { data: current } = await supabase
    .from("catalog_items")
    .select("usage_count")
    .eq("id", id)
    .eq("company_id", company.company_id)
    .maybeSingle();

  if (!current) return;

  const nextCount = ((current as { usage_count: number }).usage_count ?? 0) + 1;

  const { error } = await supabase
    .from("catalog_items")
    .update({
      usage_count: nextCount,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", company.company_id);

  if (error) logServerError("catalog.usage", error);
}

/**
 * Server action que retorna sugestões pra o autocomplete. Chamada pelo
 * componente client com debounce.
 */
export async function suggestCatalogAction(
  query: string,
): Promise<CatalogItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    return await suggestCatalogItems(query);
  } catch (e) {
    logServerError("catalog.suggest", e);
    return [];
  }
}

export async function suggestQuoteItemsAction(
  query: string,
): Promise<QuoteItemSuggestionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { items: [], sinapiStatus: "unavailable", sinapiUf: null };
  }

  const q = query.trim();
  if (q.length < 2) {
    return { items: [], sinapiStatus: "enabled", sinapiUf: null };
  }

  const company = await getActiveCompany();
  if (!company) {
    return { items: [], sinapiStatus: "unavailable", sinapiUf: null };
  }

  const catalogSuggestions = await safeCatalogSuggestions(q);
  const supabase = createClient();
  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("plan, state")
    .eq("id", company.company_id)
    .single();

  if (companyError) {
    logServerError("sinapi.suggest.company", companyError);
    return {
      items: catalogSuggestions,
      sinapiStatus: "unavailable",
      sinapiUf: null,
    };
  }

  if ((companyData as { plan?: string | null } | null)?.plan !== "ultimate") {
    return {
      items: catalogSuggestions,
      sinapiStatus: "locked",
      sinapiUf: null,
    };
  }

  const uf = normalizeBrazilStateCode(
    (companyData as { state?: string | null } | null)?.state,
  );
  if (!uf) {
    return {
      items: catalogSuggestions,
      sinapiStatus: "missing_state",
      sinapiUf: null,
    };
  }

  const { data, error } = await supabase.rpc("search_sinapi", {
    p_company_id: company.company_id,
    p_query: q,
    p_uf: uf,
    p_limit: 6,
  });

  if (error) {
    logServerError("sinapi.suggest.search", error, {
      company_id: company.company_id,
      uf,
    });
    return {
      items: catalogSuggestions,
      sinapiStatus: sinapiStatusFromError(error),
      sinapiUf: uf,
    };
  }

  const sinapiSuggestions = (data ?? []).map((item) => ({
    source: "sinapi" as const,
    id: `sinapi:${item.entry_id}:${item.uf}`,
    entry_id: item.entry_id,
    code: item.code,
    kind: item.kind,
    regime: item.regime,
    uf: item.uf,
    competence: item.competence,
    revision: item.revision,
    description: item.description,
    unit: item.unit,
    unit_price_cents: item.cost_cents,
    cost_cents: item.cost_cents,
    source_label: item.source_label,
  }));

  return {
    items: [...catalogSuggestions, ...sinapiSuggestions],
    sinapiStatus: "enabled",
    sinapiUf: uf,
  };
}

async function safeCatalogSuggestions(
  query: string,
): Promise<QuoteItemSuggestion[]> {
  try {
    const suggestions = await suggestCatalogItems(query, 4);
    return suggestions.map((item) => ({
      source: "catalog" as const,
      id: item.id,
      description: item.description,
      unit: item.unit,
      unit_price_cents: item.default_price_cents,
      usage_count: item.usage_count,
    }));
  } catch (error) {
    logServerError("catalog.suggest", error);
    return [];
  }
}

function sinapiStatusFromError(error: { code?: string; details?: string | null }) {
  if (error.details === "SINAPI_ULTIMATE_REQUIRED" || error.code === "P0001") {
    return "locked";
  }
  return "unavailable" satisfies SinapiSuggestionStatus;
}

function normalizeCatalogKey(description: string): string {
  return description.trim().toLocaleLowerCase("pt-BR");
}
