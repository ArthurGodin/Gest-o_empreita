"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { CatalogAutocomplete } from "@/components/catalog-autocomplete";
import {
  centsToBRLInput,
  normalizeQuoteUnit,
  parseBRLToCents,
  parseQuantity,
} from "@/lib/format";
import { formatBRL } from "@/lib/utils";
import {
  createCatalogItemAction,
  recordCatalogUsageAction,
} from "@/app/app/catalogo/actions";
import type { CatalogItem } from "@/lib/queries/catalog";

export interface ItemDraft {
  /** Local-only key pra React render (UUID). Não vai pro DB. */
  key: string;
  /** Se veio do catálogo, guarda o id pra incrementar usage_count no save. */
  catalog_item_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price_cents: number;
}

interface ItemRowProps {
  index: number;
  total: number;
  item: ItemDraft;
  onChange: (buildNext: (current: ItemDraft) => ItemDraft) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSavedToCatalog: () => void;
  disabled?: boolean;
}

export function ItemRow({
  index,
  total,
  item,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSavedToCatalog,
  disabled,
}: ItemRowProps) {
  const [savingCatalog, startSavingCatalog] = useTransition();
  const [, startRecordingUsage] = useTransition();

  // ─── Price input controlled, sincronizado com unit_price_cents do parent ──
  // Cenário-bug: usuário digita "500,00" sem dar blur, depois clica uma
  // sugestão do catálogo que sobrescreve unit_price_cents pra 30000. Input
  // não-controlado (defaultValue) NÃO reage à mudança externa de state.
  // Solução: priceText local + useEffect que ressincroniza quando o valor
  // do parent muda por uma fonte externa (ex: catálogo), mas não quando
  // foi o próprio blur do input que pediu a atualização.
  const [priceText, setPriceText] = useState(() =>
    centsToBRLInput(item.unit_price_cents),
  );
  const lastSyncedCents = useRef(item.unit_price_cents);

  useEffect(() => {
    if (item.unit_price_cents !== lastSyncedCents.current) {
      setPriceText(centsToBRLInput(item.unit_price_cents));
      lastSyncedCents.current = item.unit_price_cents;
    }
  }, [item.unit_price_cents]);

  // ─── Quantity input controlled (aceita "1,5" e "1.5") ───────────────────
  const [qtyText, setQtyText] = useState(() => String(item.quantity));
  const lastSyncedQty = useRef(item.quantity);
  useEffect(() => {
    if (item.quantity !== lastSyncedQty.current) {
      setQtyText(String(item.quantity));
      lastSyncedQty.current = item.quantity;
    }
  }, [item.quantity]);

  const lineTotal = Math.round(item.quantity * item.unit_price_cents);
  const canSaveToCatalog =
    item.description.trim().length >= 2 && !item.catalog_item_id && !disabled;

  function handleSelectFromCatalog(catItem: CatalogItem) {
    onChange((current) => ({
      ...current,
      catalog_item_id: catItem.id,
      description: catItem.description,
      unit: catItem.unit,
      unit_price_cents: catItem.default_price_cents,
    }));
    startRecordingUsage(() => {
      void recordCatalogUsageAction(catItem.id);
    });
  }

  function handleSaveToCatalog() {
    startSavingCatalog(async () => {
      const result = await createCatalogItemAction({
        description: item.description.trim(),
        unit: normalizeQuoteUnit(item.unit),
        default_price_cents: item.unit_price_cents,
      });
      if (result.ok) {
        onChange((current) => ({ ...current, catalog_item_id: result.id }));
        onSavedToCatalog();
        toast({
          variant: "success",
          title: "Item salvo no catálogo",
          description: "Ele já pode ser reaproveitado em outros orçamentos.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Não foi possível salvar no catálogo",
          description: result.error,
        });
      }
    });
  }

  return (
    <li className="rounded-lg border bg-background p-3 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:bg-transparent lg:px-3 lg:py-3">
      {/* Layout responsivo: mobile = stack vertical com labels, desktop = grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_84px_78px_132px_118px_auto] lg:items-end lg:gap-2">
        {/* Descrição (com autocomplete) */}
        <div className="col-span-2 lg:col-span-1">
          <Label
            className="text-xs lg:sr-only"
            htmlFor={`description-${item.key}`}
          >
            Descrição
          </Label>
          <CatalogAutocomplete
            id={`description-${item.key}`}
            value={item.description}
            onValueChange={(v) =>
              onChange((current) => ({
                ...current,
                description: v,
                catalog_item_id: null,
              }))
            }
            onSelectItem={handleSelectFromCatalog}
            placeholder="Ex: Telha cerâmica romana"
            disabled={disabled}
          />
        </div>

        {/* Quantidade (aceita "1,5" notação BR) */}
        <div>
          <Label className="text-xs lg:sr-only" htmlFor={`qty-${item.key}`}>
            Qtd
          </Label>
          <Input
            id={`qty-${item.key}`}
            type="text"
            inputMode="decimal"
            value={qtyText}
            onChange={(e) => {
              const nextText = e.target.value;
              const qty = parseQuantity(nextText);
              setQtyText(nextText);
              lastSyncedQty.current = qty;
              onChange((current) => ({ ...current, quantity: qty }));
            }}
            onBlur={() => {
              const qty = parseQuantity(qtyText);
              lastSyncedQty.current = qty;
              setQtyText(String(qty));
              onChange((current) => ({ ...current, quantity: qty }));
            }}
            disabled={disabled}
          />
        </div>

        {/* Unidade */}
        <div>
          <Label className="text-xs lg:sr-only" htmlFor={`unit-${item.key}`}>
            Un.
          </Label>
          <Input
            id={`unit-${item.key}`}
            value={item.unit}
            onChange={(e) =>
              onChange((current) => ({ ...current, unit: e.target.value }))
            }
            onBlur={() =>
              onChange((current) => ({
                ...current,
                unit: normalizeQuoteUnit(current.unit),
              }))
            }
            placeholder="un"
            maxLength={10}
            list="common-units-editor"
            disabled={disabled}
          />
          <datalist id="common-units-editor">
            {["un", "m²", "m", "kg", "h", "dia", "saco"].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>

        {/* Preço unitário (controlled — reage a updates do catálogo) */}
        <div>
          <Label className="text-xs lg:sr-only" htmlFor={`price-${item.key}`}>
            Preço unitário
          </Label>
          <Input
            id={`price-${item.key}`}
            inputMode="decimal"
            value={priceText}
            onChange={(e) => {
              const nextText = e.target.value;
              const cents = parseBRLToCents(nextText);
              setPriceText(nextText);
              if (cents != null) {
                lastSyncedCents.current = cents;
                onChange((current) => ({ ...current, unit_price_cents: cents }));
              }
            }}
            onBlur={() => {
              const cents = parseBRLToCents(priceText);
              if (cents != null) {
                lastSyncedCents.current = cents;
                setPriceText(centsToBRLInput(cents));
                onChange((current) => ({
                  ...current,
                  unit_price_cents: cents,
                }));
              } else {
                // Input inválido — restaura último valor válido
                setPriceText(centsToBRLInput(item.unit_price_cents));
              }
            }}
            placeholder="0,00"
            disabled={disabled}
          />
        </div>

        {/* Total da linha (read-only) */}
        <div>
          <Label className="text-xs lg:sr-only">Total</Label>
          <div className="flex h-11 items-center justify-end rounded-md border border-transparent px-3 text-base font-semibold lg:text-sm">
            {formatBRL(lineTotal / 100)}
          </div>
        </div>

        {/* Ações: salvar no catálogo, mover, remover */}
        <div className="col-span-2 flex items-center justify-end gap-1 lg:col-span-1">
          {canSaveToCatalog && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSaveToCatalog}
              disabled={savingCatalog}
              aria-label="Salvar no meu catálogo"
              title="Salvar no meu catálogo"
              className="text-primary hover:text-primary"
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={index === 0 || disabled}
            aria-label="Mover pra cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={index === total - 1 || disabled}
            aria-label="Mover pra baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remover item"
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {item.catalog_item_id && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary lg:mt-1">
          <Save className="h-3 w-3" aria-hidden="true" />
          Salvo no catálogo
        </div>
      )}
    </li>
  );
}
