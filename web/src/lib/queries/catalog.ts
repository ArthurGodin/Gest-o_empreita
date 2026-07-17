import { cache } from "react";
import { rankCatalogSuggestions } from "@/lib/catalog-ranking";
import { createClient } from "@/lib/supabase/server";
import type { SinapiReferenceKind, SinapiRegime } from "@/lib/supabase/types";

export interface CatalogItem {
  id: string;
  company_id: string;
  description: string;
  unit: string;
  default_price_cents: number;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  reference_source: string | null;
  sinapi_entry_id: string | null;
  reference_code: string | null;
  reference_kind: SinapiReferenceKind | null;
  reference_uf: string | null;
  reference_competence: string | null;
  reference_revision: number | null;
  reference_regime: SinapiRegime | null;
  reference_description: string | null;
  reference_unit: string | null;
  reference_cost_cents: number | null;
  reference_adjustment_basis_points: number | null;
  reference_release_sha256: string | null;
}

/**
 * Lista todos os itens do catálogo da empresa ativa, ordenados por mais usado.
 * RLS faz o filtro por tenant.
 */
export const getCatalogItems = cache(async (): Promise<CatalogItem[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .order("usage_count", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as CatalogItem[];
});

export const getCatalogItem = cache(
  async (id: string): Promise<CatalogItem | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as CatalogItem | null) ?? null;
  },
);

/**
 * Sugestões pra autocomplete — usado no editor de orçamento.
 *
 * Estratégia: prefix match em description (mais relevante) +
 * substring match como fallback. Ordenado por usage_count desc.
 * Limit fixo de 5 — não inundar o dropdown.
 */
export async function suggestCatalogItems(
  query: string,
  limit = 5,
): Promise<CatalogItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createClient();
  const [prefix, substring] = await Promise.all([
    supabase
      .from("catalog_items")
      .select("*")
      .ilike("description", `${q}%`)
      .order("usage_count", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("catalog_items")
      .select("*")
      .ilike("description", `%${q}%`)
      .order("usage_count", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(limit),
  ]);

  if (prefix.error) throw prefix.error;
  if (substring.error) throw substring.error;

  return rankCatalogSuggestions(
    (prefix.data ?? []) as unknown as CatalogItem[],
    (substring.data ?? []) as unknown as CatalogItem[],
    limit,
  );
}
