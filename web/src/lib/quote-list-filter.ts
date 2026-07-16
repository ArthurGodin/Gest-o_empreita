import type { EffectiveQuoteStatus } from "@/lib/quote-status";
import { normalizeSearch } from "@/lib/search";

export type QuoteListStatusFilter = "all" | EffectiveQuoteStatus;

export const QUOTE_LIST_STATUS_FILTERS: Array<{
  value: QuoteListStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunhos" },
  { value: "sent", label: "Enviados" },
  { value: "viewed", label: "Vistos" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Recusados" },
  { value: "expired", label: "Expirados" },
];

const STATUS_FILTER_VALUES = new Set<QuoteListStatusFilter>(
  QUOTE_LIST_STATUS_FILTERS.map((filter) => filter.value),
);

export interface QuoteListFilterItem {
  title: string;
  number: string;
  effective_status: EffectiveQuoteStatus;
  customer?: { name: string } | null;
}

export interface QuoteListFilters {
  query: string;
  status: QuoteListStatusFilter;
}

export function parseQuoteListStatusFilter(
  value: string | null | undefined,
): QuoteListStatusFilter {
  return value && STATUS_FILTER_VALUES.has(value as QuoteListStatusFilter)
    ? (value as QuoteListStatusFilter)
    : "all";
}

export function filterQuotes<T extends QuoteListFilterItem>(
  quotes: T[],
  filters: QuoteListFilters,
): T[] {
  const query = normalizeSearch(filters.query);

  return quotes.filter((quote) => {
    if (
      filters.status !== "all" &&
      quote.effective_status !== filters.status
    ) {
      return false;
    }

    if (!query) return true;

    return (
      normalizeSearch(quote.title).includes(query) ||
      normalizeSearch(quote.number).includes(query) ||
      normalizeSearch(quote.customer?.name ?? "").includes(query)
    );
  });
}

export function countQuotesByStatus<T extends QuoteListFilterItem>(
  quotes: T[],
): Record<QuoteListStatusFilter, number> {
  const counts = Object.fromEntries(
    QUOTE_LIST_STATUS_FILTERS.map((filter) => [filter.value, 0]),
  ) as Record<QuoteListStatusFilter, number>;

  counts.all = quotes.length;

  for (const quote of quotes) {
    counts[quote.effective_status] += 1;
  }

  return counts;
}
