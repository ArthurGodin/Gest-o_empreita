"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ListEmptyState,
  ListStatusFilter,
  ListToolbar,
} from "@/components/app-shell/list-toolbar";
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
import {
  useBusinessSegment,
  useBusinessVocabulary,
} from "@/components/business-segment-context";

const PROPOSAL_STATUS_LABEL: Record<EffectiveQuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  viewed: "Vista",
  approved: "Aprovada",
  rejected: "Recusada",
  expired: "Expirada",
};

const PROPOSAL_STATUS_FILTERS: typeof QUOTE_LIST_STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Rascunhos" },
  { value: "sent", label: "Enviadas" },
  { value: "viewed", label: "Vistas" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Recusadas" },
  { value: "expired", label: "Expiradas" },
];

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
  const segment = useBusinessSegment();
  const vocabulary = useBusinessVocabulary();
  const statusFilters =
    segment === "construction"
      ? QUOTE_LIST_STATUS_FILTERS
      : PROPOSAL_STATUS_FILTERS;
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
    statusFilters.find((filter) => filter.value === statusFilter)
      ?.label ?? (segment === "construction" ? "Todos" : "Todas");
  const summary = !hasActiveFilters
    ? `${quotes.length} ${
        quotes.length === 1
          ? vocabulary.quoteSingular.toLocaleLowerCase("pt-BR")
          : vocabulary.quotePluralLower
      }`
    : statusFilter === "all"
      ? `${filtered.length} de ${quotes.length} ${vocabulary.quotePluralLower}`
      : `${filtered.length} de ${quotes.length} em ${activeStatusLabel.toLocaleLowerCase("pt-BR")}`;
  const emptyDescription =
    statusFilter === "all"
      ? `Não encontramos ${vocabulary.quoteSingular.toLocaleLowerCase("pt-BR")} para “${query.trim()}”.`
      : `Não há ${vocabulary.quoteSingular.toLocaleLowerCase("pt-BR")} em ${activeStatusLabel.toLocaleLowerCase("pt-BR")}${
          query.trim() ? ` com “${query.trim()}”.` : "."
        }`;

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
      <ListToolbar
        ariaLabel={`Busca e filtros de ${vocabulary.quotePluralLower}`}
        search={{
          value: query,
          onValueChange: onQueryChange,
          name: "quote-search",
          label: `Buscar ${vocabulary.quotePluralLower}`,
          placeholder: `Buscar ${vocabulary.quoteSingular.toLocaleLowerCase("pt-BR")} por número, título ou cliente…`,
        }}
        filters={
          <ListStatusFilter
            label={`Filtrar ${vocabulary.quotePluralLower} por status`}
            value={statusFilter}
            options={statusFilters}
            counts={counts}
            onValueChange={onStatusChange}
          />
        }
        summary={
          <p>
            {summary}
            {isPending ? " · atualizando…" : ""}
          </p>
        }
        clearAll={
          hasActiveFilters
            ? { label: "Limpar filtros", onClick: clearFilters }
            : undefined
        }
      />

      {filtered.length === 0 ? (
        <ListEmptyState
          title={`${
            vocabulary.quoteSingular === "Proposta" ? "Nenhuma" : "Nenhum"
          } ${vocabulary.quoteSingular.toLocaleLowerCase("pt-BR")} ${
            vocabulary.quoteSingular === "Proposta"
              ? "encontrada"
              : "encontrado"
          }`}
          description={emptyDescription}
          actionLabel={`Ver ${
            vocabulary.quoteSingular === "Proposta" ? "todas" : "todos"
          } ${vocabulary.quotePluralLower}`}
          onAction={clearFilters}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_7rem_7rem_9rem] gap-4 border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
            <span>{vocabulary.quoteSingular}</span>
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
  const segment = useBusinessSegment();
  const vocabulary = useBusinessVocabulary();
  const colors = COLOR_CLASSES[colorOf(quote.effective_status)];

  return (
    <li className="min-w-0">
      <Link
        href={`/app/orcamentos/${quote.id}`}
        aria-label={`Abrir ${vocabulary.quoteSingular.toLocaleLowerCase("pt-BR")} ${quote.number}`}
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
            {segment === "construction"
              ? STATUS_LABEL[quote.effective_status]
              : PROPOSAL_STATUS_LABEL[quote.effective_status]}
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
