"use client";

import { Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { useBusinessVocabulary } from "@/components/business-segment-context";
import { ItemRow } from "./item-row";
import type {
  ItemDraft,
  QuoteDraftItemField,
} from "./quote-draft";

interface QuoteItemsSectionProps {
  items: ItemDraft[];
  filledItemsCount: number;
  totalCents: number;
  disabled: boolean;
  errors: Record<string, Partial<Record<QuoteDraftItemField, string>>>;
  sectionError?: string;
  removedItem: { item: ItemDraft; index: number } | null;
  onUpdateItem: (
    key: string,
    buildNext: (current: ItemDraft) => ItemDraft,
  ) => void;
  onRemoveItem: (index: number) => void;
  onMoveItem: (index: number, delta: -1 | 1) => void;
  onAddItem: () => void;
  onUndoRemove: () => void;
}

export function QuoteItemsSection({
  items,
  filledItemsCount,
  totalCents,
  disabled,
  errors,
  sectionError,
  removedItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onAddItem,
  onUndoRemove,
}: QuoteItemsSectionProps) {
  const vocabulary = useBusinessVocabulary();

  return (
    <section
      id="quote-items"
      tabIndex={-1}
      className="rounded-lg border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold text-foreground">
          Itens {vocabulary.quoteSingular === "Proposta" ? "da proposta" : "do orçamento"}
        </h2>
        <span className="text-xs text-muted-foreground">
          {filledItemsCount} {filledItemsCount === 1 ? "item" : "itens"}
        </span>
      </div>

      <div className="hidden lg:grid lg:grid-cols-[1fr_84px_78px_132px_118px_auto] lg:gap-2 lg:px-3 lg:pb-2 lg:text-[10px] lg:font-medium lg:uppercase lg:text-muted-foreground">
        <span>Descrição</span>
        <span>Qtd</span>
        <span>Un.</span>
        <span>Preço unit.</span>
        <span className="text-right">Total</span>
        <span className="sr-only">Ações</span>
      </div>

      <ul className="space-y-2 lg:space-y-0 lg:border-y">
        {items.map((item, index) => (
          <ItemRow
            key={item.key}
            index={index}
            total={items.length}
            item={item}
            onChange={(buildNext) => onUpdateItem(item.key, buildNext)}
            onRemove={() => onRemoveItem(index)}
            onMoveUp={() => onMoveItem(index, -1)}
            onMoveDown={() => onMoveItem(index, 1)}
            disabled={disabled}
            errors={errors[item.key]}
          />
        ))}
      </ul>

      <datalist id="common-units-editor">
        {["un", "m²", "m", "kg", "h", "dia", "saco"].map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      {sectionError && (
        <p className="mt-2 px-1 text-xs text-destructive">{sectionError}</p>
      )}

      {removedItem && (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          aria-live="polite"
        >
          <p className="min-w-0 text-sm text-slate-700">
            Item removido:{" "}
            <span className="font-semibold">
              {removedItem.item.description.trim() || "Item sem descrição"}
            </span>
          </p>
          <Button type="button" variant="outline" onClick={onUndoRemove}>
            <Undo2 aria-hidden="true" className="h-4 w-4" />
            Desfazer
          </Button>
        </div>
      )}

      <div className="mt-3 px-1">
        <Button
          type="button"
          variant="outline"
          onClick={onAddItem}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Adicionar item
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t px-1 pt-3">
        <span className="text-sm text-muted-foreground">
          Total {vocabulary.quoteSingular === "Proposta" ? "da proposta" : "do orçamento"}
        </span>
        <span className="text-xl font-bold tabular-nums text-primary sm:text-2xl">
          {formatBRL(totalCents / 100)}
        </span>
      </div>
    </section>
  );
}
