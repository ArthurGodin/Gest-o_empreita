import type {
  SinapiReferenceKind,
  SinapiRegime,
} from "@/lib/supabase/types";

export interface CatalogQuoteItemSuggestion {
  source: "catalog";
  id: string;
  description: string;
  unit: string;
  unit_price_cents: number;
  usage_count: number;
}

export interface SinapiQuoteItemSuggestion {
  source: "sinapi";
  id: string;
  entry_id: string;
  code: string;
  kind: SinapiReferenceKind;
  regime: SinapiRegime;
  uf: string;
  competence: string;
  revision: number;
  description: string;
  unit: string;
  unit_price_cents: number;
  cost_cents: number;
  source_label: string;
}

export type QuoteItemSuggestion =
  | CatalogQuoteItemSuggestion
  | SinapiQuoteItemSuggestion;

export type SinapiSuggestionStatus =
  | "enabled"
  | "locked"
  | "missing_state"
  | "unavailable";

export interface QuoteItemSuggestionResult {
  items: QuoteItemSuggestion[];
  sinapiStatus: SinapiSuggestionStatus;
  sinapiUf: string | null;
}
