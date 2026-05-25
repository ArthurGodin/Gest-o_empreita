"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatBRL } from "@/lib/utils";
import { formatDateBR } from "@/lib/utils";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  type EffectiveQuoteStatus,
} from "@/lib/quote-status";
import type { QuoteListItem } from "@/lib/queries/quotes";

interface QuoteListProps {
  quotes: QuoteListItem[];
}

type StatusFilter = "all" | EffectiveQuoteStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunho" },
  { value: "sent", label: "Enviados" },
  { value: "viewed", label: "Vistos" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Recusados" },
  { value: "expired", label: "Expirados" },
];

const COLOR_CLASSES: Record<
  ReturnType<typeof colorOf>,
  { bg: string; text: string }
> = {
  neutral: { bg: "bg-muted", text: "text-muted-foreground" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-800 dark:text-blue-200" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-200" },
  green: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-200" },
  red: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-200" },
  gray: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
};

function colorOf(status: EffectiveQuoteStatus) {
  return STATUS_COLOR[status];
}

export function QuoteList({ quotes }: QuoteListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    let out = quotes;
    if (statusFilter !== "all") {
      out = out.filter((q) => q.effective_status === statusFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.number.toLowerCase().includes(q) ||
          it.customer?.name.toLowerCase().includes(q),
      );
    }
    return out;
  }, [quotes, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número, título ou cliente..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-accent",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length === quotes.length
            ? `${quotes.length} ${quotes.length === 1 ? "orçamento" : "orçamentos"}`
            : `${filtered.length} de ${quotes.length}`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card py-10 text-center text-sm text-muted-foreground">
          Nenhum orçamento bate com os filtros.
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
