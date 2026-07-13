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
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-800 dark:text-emerald-200",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-200",
  },
  gray: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
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
    <div className="space-y-3">
      <section
        aria-label="Busca e filtros de orçamentos"
        className="rounded-lg border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              name="quote-search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por número, título ou cliente…"
              aria-label="Buscar orçamentos"
              className="pl-9"
            />
          </div>

          <label className="md:hidden">
            <span className="sr-only">Filtrar por status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusChange(event.target.value as QuoteListStatusFilter)
              }
              className="h-11 w-full rounded-md border border-input bg-card px-3 text-base text-slate-800 outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/20 sm:w-52"
            >
              {QUOTE_LIST_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({counts[option.value]})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 hidden flex-wrap gap-1.5 border-t pt-3 md:flex">
          {QUOTE_LIST_STATUS_FILTERS.map((option) => {
            const active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onStatusChange(option.value)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary/30 bg-primary/10 text-emerald-900"
                    : "border-input bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                <span>{option.label}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] tabular-nums",
                    active
                      ? "bg-primary/15 text-emerald-900"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[option.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground">
          <p aria-live="polite">
            {filtered.length === quotes.length && !hasActiveFilters
              ? `${quotes.length} ${quotes.length === 1 ? "orçamento" : "orçamentos"}`
              : `${filtered.length} de ${quotes.length} em ${activeStatusLabel.toLocaleLowerCase("pt-BR")}`}
            {isPending ? " · atualizando…" : ""}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 shrink-0 items-center rounded-md px-2 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-4 py-8 text-center">
          <div className="mx-auto max-w-sm space-y-3">
            <div className="text-sm font-semibold text-foreground">
              Nenhum orçamento encontrado
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Não há orçamento em {activeStatusLabel.toLocaleLowerCase("pt-BR")}
              {query.trim() ? ` com “${query.trim()}”.` : "."}
            </p>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Ver todos os orçamentos
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_7rem_7rem_9rem] gap-4 border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
            <span>Orçamento</span>
            <span>Cliente</span>
            <span>Validade</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y">
            {filtered.map((quote) => (
              <QuoteRow key={quote.id} quote={quote} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QuoteRow({ quote }: { quote: QuoteListItem }) {
  const colors = COLOR_CLASSES[colorOf(quote.effective_status)];

  return (
    <li className="min-w-0">
      <Link
        href={`/app/orcamentos/${quote.id}`}
        aria-label={`Abrir orçamento ${quote.number}`}
        className="grid min-h-[92px] min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-16 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_7rem_7rem_9rem] md:items-center md:gap-4 md:py-3"
      >
        <span className="col-span-2 min-w-0 md:col-span-1">
          <span className="block text-xs font-semibold text-muted-foreground">
            {quote.number}
          </span>
          <span
            title={quote.title}
            className="block truncate text-sm font-semibold text-slate-950"
          >
            {quote.title}
          </span>
        </span>

        <span
          title={quote.customer?.name ?? "Sem cliente"}
          className="min-w-0 truncate text-sm text-slate-600"
        >
          {quote.customer?.name ?? "Sem cliente"}
        </span>

        <span className="justify-self-end md:col-start-4 md:row-start-1 md:justify-self-start">
          <span
            className={cn(
              "inline-flex w-fit max-w-full truncate rounded-md px-2 py-1 text-xs font-semibold",
              colors.bg,
              colors.text,
            )}
          >
            {STATUS_LABEL[quote.effective_status]}
          </span>
        </span>

        <span className="text-xs text-muted-foreground md:col-start-3 md:row-start-1">
          {quote.valid_until ? (
            <>
              <span className="md:hidden">Válido até </span>
              {formatDateBR(quote.valid_until)}
            </>
          ) : (
            "Sem validade"
          )}
        </span>

        <span className="justify-self-end self-end text-base font-bold tabular-nums text-primary md:col-start-5 md:row-start-1 md:self-auto md:text-right">
          {formatBRL(quote.total_cents / 100)}
        </span>
      </Link>
    </li>
  );
}
