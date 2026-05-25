"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { suggestCatalogItems, type CatalogItem } from "@/lib/queries/catalog";
import { clientErrorFor, logServerError } from "@/lib/log";

const itemSchema = z.object({
  description: z.string().trim().min(2, "Descrição precisa ter pelo menos 2 caracteres"),
  unit: z.string().trim().min(1, "Informe a unidade").max(10, "Unidade até 10 caracteres"),
  default_price_cents: z
    .number()
    .int()
    .min(0, "Preço não pode ser negativo")
    .max(1_000_000_000_00, "Preço máximo R$ 1 bilhão"),
});

export type CatalogActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

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
