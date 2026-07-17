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
import type { QuoteItemSuggestion } from "@/lib/quote-item-suggestions";
import type {
  ItemDraft,
  QuoteDraftItemField,
} from "./quote-draft";

interface ItemRowProps {
  index: number;
  total: number;
  item: ItemDraft;
  onChange: (buildNext: (current: ItemDraft) => ItemDraft) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
  errors?: Partial<Record<QuoteDraftItemField, string>>;
}

export function ItemRow({
  index,
  total,
  item,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  disabled,
  errors,
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
    item.description.trim().length >= 2 &&
    !item.catalog_item_id &&
    !item.sinapi_entry_id &&
    !disabled;

  function handleSelectSuggestion(suggestion: QuoteItemSuggestion) {
    if (suggestion.source === "sinapi") {
      onChange((current) => ({
        ...current,
        catalog_item_id: null,
        description: suggestion.description,
        unit: suggestion.unit,
        unit_price_cents: suggestion.unit_price_cents,
        sinapi_entry_id: suggestion.entry_id,
        reference_uf: suggestion.uf,
        reference_code: suggestion.code,
        reference_competence: suggestion.competence,
        reference_cost_cents: suggestion.cost_cents,
        reference_adjustment_basis_points: 0,
      }));
      return;
    }

    onChange((current) => ({
      ...current,
      catalog_item_id: suggestion.id,
      description: suggestion.description,
      unit: suggestion.unit,
      unit_price_cents: suggestion.unit_price_cents,
      sinapi_entry_id: null,
      reference_uf: null,
      reference_code: null,
      reference_competence: null,
      reference_cost_cents: null,
      reference_adjustment_basis_points: null,
    }));
    startRecordingUsage(() => {
      void recordCatalogUsageAction(suggestion.id);
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
    <li className="rounded-lg border bg-background p-3 focus-within:border-primary/40 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:bg-transparent lg:px-3 lg:py-3">
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
            name={`items.${index}.description`}
            value={item.description}
            onValueChange={(v) =>
              onChange((current) => ({
                ...current,
                description: v,
                catalog_item_id: null,
                sinapi_entry_id: null,
                reference_uf: null,
                reference_code: null,
                reference_competence: null,
                reference_cost_cents: null,
                reference_adjustment_basis_points: null,
              }))
            }
            onSelectItem={handleSelectSuggestion}
            placeholder="Ex: Telha cerâmica romana"
            disabled={disabled}
            ariaInvalid={Boolean(errors?.description)}
            ariaDescribedBy={
              errors?.description ? `description-${item.key}-error` : undefined
            }
            inputClassName={
              errors?.description ? "border-destructive" : undefined
            }
          />
          {errors?.description && (
            <p
              id={`description-${item.key}-error`}
              className="mt-1.5 text-xs text-destructive"
            >
              {errors.description}
            </p>
          )}
        </div>

        {/* Quantidade (aceita "1,5" notação BR) */}
        <div>
          <Label className="text-xs lg:sr-only" htmlFor={`qty-${item.key}`}>
            Qtd
          </Label>
          <Input
            id={`qty-${item.key}`}
            name={`items.${index}.quantity`}
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
            autoComplete="off"
            aria-invalid={Boolean(errors?.quantity) || undefined}
            aria-describedby={
              errors?.quantity ? `qty-${item.key}-error` : undefined
            }
            className={errors?.quantity ? "border-destructive" : undefined}
          />
          {errors?.quantity && (
            <p
              id={`qty-${item.key}-error`}
              className="mt-1.5 text-xs text-destructive"
            >
              {errors.quantity}
            </p>
          )}
        </div>

        {/* Unidade */}
        <div>
          <Label className="text-xs lg:sr-only" htmlFor={`unit-${item.key}`}>
            Un.
          </Label>
          <Input
            id={`unit-${item.key}`}
            name={`items.${index}.unit`}
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
            autoComplete="off"
            aria-invalid={Boolean(errors?.unit) || undefined}
            aria-describedby={
              errors?.unit ? `unit-${item.key}-error` : undefined
            }
            className={errors?.unit ? "border-destructive" : undefined}
          />
          {errors?.unit && (
            <p
              id={`unit-${item.key}-error`}
              className="mt-1.5 text-xs text-destructive"
            >
              {errors.unit}
            </p>
          )}
        </div>

        {/* Preço unitário (controlled — reage a updates do catálogo) */}
        <div>
          <Label className="text-xs lg:sr-only" htmlFor={`price-${item.key}`}>
            Preço unitário
          </Label>
          <Input
            id={`price-${item.key}`}
            name={`items.${index}.unit_price`}
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
            autoComplete="off"
            aria-invalid={Boolean(errors?.unit_price_cents) || undefined}
            aria-describedby={
              errors?.unit_price_cents
                ? `price-${item.key}-error`
                : undefined
            }
            className={
              errors?.unit_price_cents ? "border-destructive" : undefined
            }
          />
          {errors?.unit_price_cents && (
            <p
              id={`price-${item.key}-error`}
              className="mt-1.5 text-xs text-destructive"
            >
              {errors.unit_price_cents}
            </p>
          )}
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
              <Save aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={index === 0 || disabled}
            aria-label="Mover pra cima"
            title="Mover pra cima"
          >
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={index === total - 1 || disabled}
            aria-label="Mover pra baixo"
            title="Mover pra baixo"
          >
            <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remover item"
            title="Remover item"
            className="text-destructive hover:text-destructive"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {item.sinapi_entry_id ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 lg:mt-1">
          <Save className="h-3 w-3" aria-hidden="true" />
          SINAPI {item.reference_uf}
          {item.reference_code ? ` · ${item.reference_code}` : null}
        </div>
      ) : item.catalog_item_id ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary lg:mt-1">
          <Save className="h-3 w-3" aria-hidden="true" />
          Salvo no catálogo
        </div>
      ) : null}
    </li>
  );
}
