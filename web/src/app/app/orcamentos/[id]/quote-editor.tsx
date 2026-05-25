"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/utils";
import { updateQuoteAction } from "../actions";
import { ItemRow, type ItemDraft } from "./item-row";
import type { Customer } from "@/lib/queries/customers";
import type { QuoteWithRelations } from "@/lib/queries/quotes";

interface QuoteEditorProps {
  quote: QuoteWithRelations;
  customers: Customer[];
}

function newDraft(): ItemDraft {
  return {
    key: crypto.randomUUID(),
    catalog_item_id: null,
    description: "",
    unit: "un",
    quantity: 1,
    unit_price_cents: 0,
  };
}

export function QuoteEditor({ quote, customers }: QuoteEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Header state
  const [title, setTitle] = useState(quote.title);
  const [description, setDescription] = useState(quote.description ?? "");
  const [customerId, setCustomerId] = useState(quote.customer_id);
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "");
  const [notes, setNotes] = useState(quote.notes ?? "");

  // Items state — começa do quote ou com 1 item vazio se nenhum
  const [items, setItems] = useState<ItemDraft[]>(() => {
    if (quote.items.length === 0) return [newDraft()];
    return quote.items.map((it) => ({
      key: it.id,
      catalog_item_id: null,
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      unit_price_cents: it.unit_price_cents,
    }));
  });

  const total = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + Math.round(it.quantity * it.unit_price_cents),
        0,
      ),
    [items],
  );

  function updateItem(idx: number, next: ItemDraft) {
    setItems((curr) => curr.map((it, i) => (i === idx ? next : it)));
  }
  function removeItem(idx: number) {
    setItems((curr) =>
      curr.length === 1 ? [newDraft()] : curr.filter((_, i) => i !== idx),
    );
  }
  function addItem() {
    setItems((curr) => [...curr, newDraft()]);
  }
  function moveItem(idx: number, delta: -1 | 1) {
    setItems((curr) => {
      const target = idx + delta;
      if (target < 0 || target >= curr.length) return curr;
      const out = [...curr];
      [out[idx], out[target]] = [out[target]!, out[idx]!];
      return out;
    });
  }

  function onSave() {
    setError(null);

    // Validação client-side leve antes de mandar pro server
    const filledItems = items.filter((it) => it.description.trim());
    if (filledItems.length === 0) {
      setError("Adicione ao menos um item com descrição.");
      return;
    }

    startTransition(async () => {
      const result = await updateQuoteAction(quote.id, {
        title,
        description,
        customer_id: customerId,
        valid_until: validUntil || undefined,
        notes,
        items: filledItems.map((it) => ({
          description: it.description.trim(),
          unit: it.unit.trim() || "un",
          quantity: it.quantity,
          unit_price_cents: it.unit_price_cents,
          catalog_item_id: it.catalog_item_id ?? null,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
          Dados do orçamento
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex: Cobertura nova — Casa Maria Santos"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? ` — ${c.city}` : ""}
                    {c.state ? `/${c.state}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Válido até</Label>
              <Input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes sobre o serviço, escopo, condições..."
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* ── Itens ──────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Itens do orçamento
          </h2>
          <span className="text-xs text-muted-foreground">
            {items.filter((i) => i.description.trim()).length}{" "}
            {items.filter((i) => i.description.trim()).length === 1 ? "item" : "itens"}
          </span>
        </div>

        {/* Header de colunas no desktop */}
        <div className="hidden md:grid md:grid-cols-[1fr_70px_60px_120px_110px_auto] md:gap-2 md:px-3 md:pb-2 md:text-[10px] md:font-medium md:uppercase md:tracking-wider md:text-muted-foreground">
          <span>Descrição</span>
          <span>Qtd</span>
          <span>Un.</span>
          <span>Preço unit.</span>
          <span className="text-right">Total</span>
          <span></span>
        </div>

        <ul className="space-y-3">
          {items.map((item, idx) => (
            <ItemRow
              key={item.key}
              index={idx}
              total={items.length}
              item={item}
              onChange={(next) => updateItem(idx, next)}
              onRemove={() => removeItem(idx)}
              onMoveUp={() => moveItem(idx, -1)}
              onMoveDown={() => moveItem(idx, 1)}
              onSavedToCatalog={() => {
                /* opcional: feedback visual já vem do pill na ItemRow */
              }}
              disabled={pending}
            />
          ))}
        </ul>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            disabled={pending}
          >
            <Plus className="h-4 w-4" />
            Adicionar item
          </Button>
        </div>

        {/* Total geral */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <span className="text-sm text-muted-foreground">Total do orçamento</span>
          <span className="text-2xl font-bold text-primary">
            {formatBRL(total / 100)}
          </span>
        </div>
      </section>

      {/* ── Observações ────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
          Observações (aparecem pro cliente no link)
        </h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Pagamento em 3x sem juros. Início da obra em 5 dias úteis após aprovação. Garantia de 12 meses na mão de obra."
          rows={3}
        />
      </section>

      {/* ── Erro + Salvar ──────────────────────────────────────── */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="button" onClick={onSave} disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
