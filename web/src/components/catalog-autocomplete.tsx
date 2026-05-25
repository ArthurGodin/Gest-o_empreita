"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { suggestCatalogAction } from "@/app/app/catalogo/actions";
import type { CatalogItem } from "@/lib/queries/catalog";

interface CatalogAutocompleteProps {
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
  value,
  onValueChange,
  onSelectItem,
  placeholder,
  required,
  className,
  disabled,
}: CatalogAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await suggestCatalogAction(q);
        setSuggestions(results);
        setOpen(results.length > 0);
        setHighlight(0);
      });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function pick(item: CatalogItem) {
    onValueChange(item.description);
    onSelectItem(item);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = suggestions[highlight];
      if (item) pick(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => {
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay pra permitir click numa sugestão antes de fechar
          blurTimeoutRef.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
      />

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-popover shadow-md"
        >
          {suggestions.map((item, idx) => (
            <li
              key={item.id}
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
