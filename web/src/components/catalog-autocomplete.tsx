"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { suggestCatalogAction } from "@/app/app/catalogo/actions";
import type { CatalogItem } from "@/lib/queries/catalog";

interface CatalogAutocompleteProps {
  id?: string;
  /** Valor controlado do input */
  value: string;
  /** Disparado a cada keystroke (mantém input controlado) */
  onValueChange: (value: string) => void;
  /** Disparado quando usuário escolhe um item do catálogo */
  onSelectItem: (item: CatalogItem) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Disabled enquanto outra ação está pending no editor */
  disabled?: boolean;
}

/**
 * Input com dropdown de sugestões do catálogo da empresa.
 *
 * - Debounce 200ms
 * - Chama server action `suggestCatalogAction` (RLS-scoped, retorna ≤5)
 * - Mostra: descrição (highlight do prefix), unidade, preço default
 * - Click numa sugestão → preenche o input + dispara `onSelectItem`
 * - Mantém aberto enquanto user digita; fecha em blur com delay (pra permitir click)
 */
export function CatalogAutocomplete({
  id,
  value,
  onValueChange,
  onSelectItem,
  placeholder,
  required,
  className,
  disabled,
}: CatalogAutocompleteProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const listboxId = `${generatedId}-listbox`;
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);
  const selectedValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 2 || q === selectedValueRef.current) {
      requestSeqRef.current += 1;
      setLoading(false);
      setOpen(false);
      setSuggestions([]);
      return;
    }

    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setLoading(true);
    setOpen(focused);
    setSuggestions([]);

    debounceRef.current = setTimeout(() => {
      suggestCatalogAction(q)
        .then((results) => {
          if (requestSeqRef.current !== requestSeq) return;
          setSuggestions(results);
          setOpen(focused);
          setHighlight(0);
        })
        .finally(() => {
          if (requestSeqRef.current === requestSeq) setLoading(false);
        });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, focused]);

  const visibleSuggestions = value.trim().length >= 2 ? suggestions : [];

  function pick(item: CatalogItem) {
    selectedValueRef.current = item.description;
    onValueChange(item.description);
    onSelectItem(item);
    setOpen(false);
    setSuggestions([]);
  }

  function handleValueChange(nextValue: string) {
    selectedValueRef.current = null;
    onValueChange(nextValue);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || (visibleSuggestions.length === 0 && e.key !== "Escape")) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, visibleSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = visibleSuggestions[highlight];
      if (item) pick(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <PackageSearch
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
          if (value.trim().length >= 2 && value.trim() !== selectedValueRef.current) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          // Delay pra permitir click numa sugestão antes de fechar
          blurTimeoutRef.current = setTimeout(() => {
            setFocused(false);
            setOpen(false);
          }, 150);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className="pl-9 pr-9"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && visibleSuggestions[highlight]
            ? `${listboxId}-${visibleSuggestions[highlight].id}`
            : undefined
        }
        aria-haspopup="listbox"
        aria-busy={loading}
        role="combobox"
      />

      {loading && (
        <Loader2
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      )}

      {open && value.trim().length >= 2 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-popover shadow-md"
        >
          {loading && visibleSuggestions.length === 0 && (
            <li
              role="option"
              aria-disabled="true"
              aria-selected="false"
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Buscando no catálogo…
            </li>
          )}
          {!loading && visibleSuggestions.length === 0 && (
            <li
              role="option"
              aria-disabled="true"
              aria-selected="false"
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Nenhum item encontrado.
            </li>
          )}
          {visibleSuggestions.map((item, idx) => (
            <li
              key={item.id}
              id={`${listboxId}-${item.id}`}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(e) => {
                // mousedown (não click) pra disparar antes do blur do input
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setHighlight(idx)}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                idx === highlight
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{item.description}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBRL(item.default_price_cents / 100)}/{item.unit}
                </span>
              </div>
              {item.usage_count > 0 && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  usado {item.usage_count}× no catálogo
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
