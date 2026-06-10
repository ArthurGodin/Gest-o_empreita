"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatBRL, formatDateBR } from "@/lib/utils";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  type EffectiveQuoteStatus,
} from "@/lib/quote-status";
import {
  countQuotesByStatus,
  filterQuotes,
  parseQuoteListStatusFilter,
  QUOTE_LIST_STATUS_FILTERS,
  type QuoteListStatusFilter,
} from "@/lib/quote-list-filter";
import type { QuoteListItem } from "@/lib/queries/quotes";

interface QuoteListProps {
  quotes: QuoteListItem[];
}

const COLOR_CLASSES: Record<
  ReturnType<typeof colorOf>,
  { bg: string; text: string }
> = {
  neutral: { bg: "bg-muted", text: "text-muted-foreground" },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-800 dark:text-blue-200",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-800 dark:text-amber-200",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-800 dark:text-green-200",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-200",
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
  },
};

function colorOf(status: EffectiveQuoteStatus) {
  return STATUS_COLOR[status];
}

export function QuoteList({ quotes }: QuoteListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<QuoteListStatusFilter>(() =>
    parseQuoteListStatusFilter(searchParams.get("status")),
  );

  const counts = useMemo(() => countQuotesByStatus(quotes), [quotes]);
  const filtered = useMemo(
    () => filterQuotes(quotes, { query, status: statusFilter }),
    [quotes, query, statusFilter],
  );

  const hasActiveFilters = statusFilter !== "all" || query.trim().length > 0;
  const activeStatusLabel =
    QUOTE_LIST_STATUS_FILTERS.find((filter) => filter.value === statusFilter)
      ?.label ?? "Todos";

  function updateUrl(next: { query?: string; status?: QuoteListStatusFilter }) {
    const nextQuery = next.query ?? query;
    const nextStatus = next.status ?? statusFilter;
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    else params.delete("q");

    if (nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");

    const href = params.toString() ? `${pathname}?${params}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    updateUrl({ query: value });
  }

  function onStatusChange(value: QuoteListStatusFilter) {
    setStatusFilter(value);
    updateUrl({ status: value });
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    updateUrl({ query: "", status: "all" });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por número, título ou cliente..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUOTE_LIST_STATUS_FILTERS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onStatusChange(opt.value)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent",
                )}
              >
                <span>{opt.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[11px]",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[opt.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite">
            {filtered.length === quotes.length && !hasActiveFilters
              ? `${quotes.length} ${quotes.length === 1 ? "orçamento" : "orçamentos"}`
              : `${filtered.length} de ${quotes.length} em ${activeStatusLabel.toLocaleLowerCase("pt-BR")}`}
            {isPending ? " · atualizando..." : ""}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="self-start font-medium text-primary underline-offset-4 hover:underline sm:self-auto"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-4 py-10 text-center">
          <div className="mx-auto max-w-sm space-y-3">
            <div className="text-sm font-medium text-foreground">
              Nenhum orçamento encontrado
            </div>
            <p className="text-sm text-muted-foreground">
              Não há orçamento em {activeStatusLabel.toLocaleLowerCase("pt-BR")}
              {query.trim() ? ` com "${query.trim()}".` : "."}
            </p>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Ver todos os orçamentos
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((quote) => (
            <li key={quote.id}>
              <QuoteCard quote={quote} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuoteCard({ quote }: { quote: QuoteListItem }) {
  const colorKey = colorOf(quote.effective_status);
  const colors = COLOR_CLASSES[colorKey];

  return (
    <div className="group relative rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-within:border-primary/40">
      <Link
        href={`/app/orcamentos/${quote.id}`}
        aria-label={`Abrir orçamento ${quote.number}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      <div className="pointer-events-none relative space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs text-muted-foreground">
              {quote.number}
            </div>
            <h3 className="truncate font-semibold leading-tight">
              {quote.title}
            </h3>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              colors.bg,
              colors.text,
            )}
          >
            {STATUS_LABEL[quote.effective_status]}
          </span>
        </div>

        {quote.customer && (
          <div className="text-sm text-muted-foreground">
            {quote.customer.name}
          </div>
        )}

        <div className="flex items-end justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            {quote.valid_until
              ? `Válido até ${formatDateBR(quote.valid_until)}`
              : "Sem validade"}
          </div>
          <div className="text-lg font-bold text-primary">
            {formatBRL(quote.total_cents / 100)}
          </div>
        </div>
      </div>
    </div>
  );
}
