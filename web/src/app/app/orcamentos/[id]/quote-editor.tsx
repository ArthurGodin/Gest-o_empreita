"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  ClipboardCheck,
  Copy,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { normalizeQuoteUnit } from "@/lib/format";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { updateQuoteAction } from "../actions/update";
import { ItemRow, type ItemDraft } from "./item-row";
import { SendQuoteButton } from "./send-quote-button";
import type { Customer } from "@/lib/queries/customers";
import type { QuoteWithRelations } from "@/lib/queries/quotes";

interface QuoteEditorProps {
  quote: QuoteWithRelations;
  customers: Customer[];
  revisionSource?: QuoteWithRelations | null;
}

function newDraft(key = crypto.randomUUID()): ItemDraft {
  return {
    key,
    catalog_item_id: null,
    description: "",
    unit: "un",
    quantity: 1,
    unit_price_cents: 0,
  };
}

export function QuoteEditor({
  quote,
  customers,
  revisionSource,
}: QuoteEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const revisionRequest = revisionSource?.approvals
    .filter((approval) => approval.action === "rejected")
    .at(-1);

  // Header state
  const [title, setTitle] = useState(quote.title);
  const [description, setDescription] = useState(quote.description ?? "");
  const [customerId, setCustomerId] = useState(quote.customer_id);
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "");
  const [notes, setNotes] = useState(quote.notes ?? "");

  // Items state — começa do quote ou com 1 item vazio se nenhum
  const [items, setItems] = useState<ItemDraft[]>(() => {
    if (quote.items.length === 0) return [newDraft("initial-empty-item")];
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
  const selectedCustomer =
    customers.find((customer) => customer.id === customerId) ?? quote.customer;

  function updateItem(
    key: string,
    buildNext: (current: ItemDraft) => ItemDraft,
  ) {
    setItems((curr) =>
      curr.map((it) => (it.key === key ? buildNext(it) : it)),
    );
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

  /**
   * Salva o draft de forma assíncrona. Retorna true se salvou OK, false se
   * teve erro. Pode ser usada tanto pelo botão "Salvar" quanto pelo
   * "Salvar e enviar" (via SendQuoteButton.onBeforeSend).
   */
  async function doSave(options: { quiet?: boolean } = {}): Promise<boolean> {
    setError(null);

    const filledItems = items.filter((it) => it.description.trim());
    if (filledItems.length === 0) {
      const message = "Adicione ao menos um item com descrição.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Orçamento incompleto",
        description: message,
      });
      return false;
    }

    const result = await updateQuoteAction(quote.id, {
      title,
      description,
      customer_id: customerId,
      valid_until: validUntil || undefined,
      notes,
      items: filledItems.map((it) => ({
        description: it.description.trim(),
        unit: normalizeQuoteUnit(it.unit),
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        catalog_item_id: it.catalog_item_id ?? null,
      })),
    });

    if (!result.ok) {
      setError(result.error);
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: result.error,
      });
      return false;
    }

    router.refresh();
    if (!options.quiet) {
      toast({
        variant: "success",
        title: "Rascunho salvo",
        description: "As alterações do orçamento foram gravadas.",
      });
    }
    return true;
  }

  function onSave() {
    startTransition(async () => {
      await doSave();
    });
  }

  return (
    <div className="space-y-6">
      {revisionSource && revisionRequest && (
        <RevisionBriefing
          sourceId={revisionSource.id}
          sourceNumber={revisionSource.number}
          sourceTitle={revisionSource.title}
          signerName={revisionRequest.signer_name}
          requestedAt={revisionRequest.created_at}
          reason={revisionRequest.rejection_reason}
        />
      )}

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
        <div className="hidden md:grid md:grid-cols-[1fr_84px_78px_132px_118px_auto] md:gap-2 md:px-3 md:pb-2 md:text-[10px] md:font-medium md:uppercase md:tracking-wider md:text-muted-foreground">
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
              onChange={(buildNext) => updateItem(item.key, buildNext)}
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
      <div className="sticky bottom-16 z-30 -mx-4 border-t bg-background/95 px-4 py-3 shadow-[0_-16px_36px_rgba(15,23,42,0.10)] backdrop-blur md:bottom-4 md:mx-0 md:rounded-xl md:border md:px-4 md:shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2 lg:bg-transparent lg:p-0">
            <div className="min-w-0">
              <div className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {revisionSource ? "Revisão pronta para reenvio" : "Próximo passo"}
              </div>
              <div className="truncate text-sm font-medium text-foreground">
                <span className="sm:hidden">WhatsApp pronto</span>
                <span className="hidden sm:inline">
                  Salve e abra o WhatsApp com a mensagem pronta.
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="text-lg font-bold text-primary tabular-nums">
                {formatBRL(total / 100)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[0.8fr_1.2fr] items-center gap-2 sm:flex sm:flex-row lg:shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onSave}
              disabled={pending}
              className="h-11 px-3"
            >
              <Save className="h-4 w-4" />
              {pending ? (
                "Salvando…"
              ) : (
                <>
                  <span className="sm:hidden">Salvar</span>
                  <span className="hidden sm:inline">Salvar rascunho</span>
                </>
              )}
            </Button>
            <SendQuoteButton
              quoteId={quote.id}
              quoteNumber={quote.number}
              quoteTitle={title}
              quoteTotalCents={total}
              customerName={selectedCustomer?.name}
              customerPhone={selectedCustomer?.phone}
              whatsappSentAt={quote.whatsapp_sent_at}
              onBeforeSend={() => doSave({ quiet: true })}
              disabled={pending}
              label={
                revisionSource ? (
                  <>
                    <span className="sm:hidden">Enviar revisão</span>
                    <span className="hidden sm:inline">Salvar e enviar revisão</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Enviar WhatsApp</span>
                    <span className="hidden sm:inline">
                      Salvar e enviar no WhatsApp
                    </span>
                  </>
                )
              }
              messageMode={revisionSource ? "revision" : "quote"}
              className="h-11 w-full px-3 sm:w-auto sm:min-w-[240px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RevisionBriefing({
  sourceId,
  sourceNumber,
  sourceTitle,
  signerName,
  requestedAt,
  reason,
}: {
  sourceId: string;
  sourceNumber: string;
  sourceTitle: string;
  signerName: string;
  requestedAt: string;
  reason: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const cleanedReason =
    reason?.trim() || "Cliente pediu ajustes sem detalhar o motivo.";

  async function copyReason() {
    try {
      await navigator.clipboard.writeText(cleanedReason);
      setCopied(true);
      toast({
        variant: "success",
        title: "Pedido copiado",
        description: "Use como referência enquanto ajusta a revisão.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível copiar",
        description: "Selecione o texto do pedido manualmente.",
      });
    }
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold">
                Revisão criada a partir de uma recusa
              </div>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                {signerName} pediu mudanças em {formatDateBR(requestedAt)} no
                orçamento{" "}
                <Link
                  href={`/app/orcamentos/${sourceId}`}
                  className="font-mono font-semibold underline-offset-4 hover:underline"
                >
                  {sourceNumber}
                </Link>
                . Ajuste esta versão e envie um novo link para o cliente.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-white/75 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase text-amber-900/70">
                  Pedido do cliente
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                  {cleanedReason}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyReason}
                className="h-10 shrink-0 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
              >
                {copied ? (
                  <ClipboardCheck className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/75 p-3">
          <div className="text-xs font-semibold uppercase text-amber-900/70">
            Roteiro de reenvio
          </div>
          <ol className="mt-2 space-y-2 text-sm leading-6">
            <li>1. Ajuste descrição, itens, valores ou observações.</li>
            <li>2. Clique em salvar e enviar revisão no WhatsApp.</li>
            <li>3. Envie a mensagem pronta pelo WhatsApp.</li>
          </ol>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3 h-10 w-full border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
          >
            <Link href={`/app/orcamentos/${sourceId}`}>
              Ver orçamento original
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-3 truncate font-mono text-xs text-amber-900/70">
            {sourceNumber} · {sourceTitle}
          </div>
        </div>
      </div>
    </section>
  );
}
