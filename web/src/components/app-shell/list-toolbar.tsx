"use client";

import type { ReactNode } from "react";
import { Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ListToolbarProps {
  ariaLabel: string;
  search: {
    value: string;
    onValueChange: (value: string) => void;
    name: string;
    label: string;
    placeholder: string;
  };
  actions?: ReactNode;
  filters?: ReactNode;
  summary?: ReactNode;
  clearAll?: {
    label: string;
    onClick: () => void;
  };
}

export function ListToolbar({
  ariaLabel,
  search,
  actions,
  filters,
  summary,
  clearAll,
}: ListToolbarProps) {
  return (
    <section
      aria-label={ariaLabel}
      className="rounded-lg border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            name={search.name}
            inputMode="search"
            autoComplete="off"
            value={search.value}
            onChange={(event) => search.onValueChange(event.target.value)}
            placeholder={search.placeholder}
            aria-label={search.label}
            className={cn("pl-9", search.value && "pr-11")}
          />
          {search.value ? (
            <button
              type="button"
              onClick={() => search.onValueChange("")}
              aria-label="Limpar busca"
              title="Limpar busca"
              className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {actions ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>

      {filters ? <div className="mt-3 border-t pt-3">{filters}</div> : null}

      {summary || clearAll ? (
        <div className="mt-2 flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground">
          <div aria-live="polite">{summary}</div>
          {clearAll ? (
            <button
              type="button"
              onClick={clearAll.onClick}
              className="inline-flex h-8 shrink-0 items-center rounded-md px-2 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {clearAll.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

interface ListStatusFilterProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  counts: Record<T, number>;
  onValueChange: (value: T) => void;
}

export function ListStatusFilter<T extends string>({
  label,
  value,
  options,
  counts,
  onValueChange,
}: ListStatusFilterProps<T>) {
  return (
    <>
      <label className="block lg:hidden">
        <span className="sr-only">{label}</span>
        <select
          value={value}
          onChange={(event) => onValueChange(event.target.value as T)}
          className="h-11 w-full rounded-md border border-input bg-card px-3 text-base text-slate-800 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({counts[option.value]})
            </option>
          ))}
        </select>
      </label>

      <div className="hidden flex-wrap gap-1.5 lg:flex">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onValueChange(option.value)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
    </>
  );
}

interface ListEmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function ListEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: ListEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-4 py-7 text-center">
      <SearchX
        aria-hidden="true"
        className="mx-auto h-5 w-5 text-muted-foreground"
      />
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-pretty text-sm leading-5 text-muted-foreground">
        {description}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
