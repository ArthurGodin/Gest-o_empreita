"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { checkSendReadiness } from "@/lib/quote-status";
import { updateQuoteAction } from "../actions/update";
import {
  isPristineQuoteItem,
  quoteDraftSignature,
  toPersistedQuoteDraft,
  validateQuoteDraft,
  type ItemDraft,
  type QuoteDraft,
  type QuoteDraftField,
} from "./quote-draft";
import { ProtectedDraftNavigation } from "./protected-draft-navigation";
import { QuoteDetailsSection } from "./quote-details-section";
import { QuoteItemsSection } from "./quote-items-section";
import { QuoteNotesSection } from "./quote-notes-section";
import { QuoteSaveBar, type QuoteSaveStatus } from "./quote-save-bar";
import { RevisionBriefing } from "./revision-briefing";
import { SendReadinessPanel } from "./send-readiness-panel";
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

function initialItems(quote: QuoteWithRelations): ItemDraft[] {
  if (quote.items.length === 0) return [newDraft("initial-empty-item")];
  return quote.items.map((item) => ({
    key: item.id,
    catalog_item_id: null,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
  }));
}

function initialQuoteDraft(quote: QuoteWithRelations): QuoteDraft {
  return {
    title: quote.title,
    description: quote.description ?? "",
    customer_id: quote.customer_id,
    valid_until: quote.valid_until ?? "",
    notes: quote.notes ?? "",
    items: initialItems(quote),
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
  const [operationState, setOperationState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<QuoteDraftField, string>>
  >({});
  const [removedItem, setRemovedItem] = useState<{
    item: ItemDraft;
    index: number;
  } | null>(null);
  const revisionRequest = revisionSource?.approvals
    .filter((approval) => approval.action === "rejected")
    .at(-1);

  // Header state
  const [title, setTitle] = useState(quote.title);
  const [description, setDescription] = useState(quote.description ?? "");
  const [customerId, setCustomerId] = useState(quote.customer_id);
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "");
  const [notes, setNotes] = useState(quote.notes ?? "");

  const [items, setItems] = useState<ItemDraft[]>(() => initialItems(quote));
  const [savedSignature, setSavedSignature] = useState(() =>
    quoteDraftSignature(initialQuoteDraft(quote)),
  );

  const draft = useMemo<QuoteDraft>(
    () => ({
      title,
      description,
      customer_id: customerId,
      valid_until: validUntil,
      notes,
      items,
    }),
    [customerId, description, items, notes, title, validUntil],
  );
  const persistedDraft = useMemo(() => toPersistedQuoteDraft(draft), [draft]);
  const currentSignature = useMemo(
    () => JSON.stringify(persistedDraft),
    [persistedDraft],
  );
  const validation = useMemo(() => validateQuoteDraft(draft), [draft]);
  const isDirty = currentSignature !== savedSignature;
  const lastObservedSignature = useRef(currentSignature);

  useEffect(() => {
    if (lastObservedSignature.current === currentSignature) return;
    lastObservedSignature.current = currentSignature;
    setError(null);
    setServerFieldErrors({});
    setOperationState((current) => (current === "error" ? "idle" : current));
  }, [currentSignature]);

  useEffect(() => {
    if (!focusTargetId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(focusTargetId);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", inline: "nearest" });
      setFocusTargetId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusTargetId]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + Math.round(it.quantity * it.unit_price_cents),
        0,
      ),
    [items],
  );
  const filledItems = useMemo(
    () => items.filter((it) => it.description.trim()),
    [items],
  );
  const readiness = useMemo(
    () =>
      checkSendReadiness({
        title,
        customer_id: customerId,
        valid_until: validUntil || null,
        itemsCount: filledItems.length,
        total_cents: total,
      }),
    [customerId, filledItems.length, title, total, validUntil],
  );
  const readinessChecks = useMemo(
    () => [
      {
        label: "Título preenchido",
        ok: Boolean(title.trim()),
        help: "Dê um nome fácil de reconhecer no WhatsApp e no PDF.",
      },
      {
        label: "Cliente escolhido",
        ok: Boolean(customerId),
        help: "O cliente aparece no link público e na aprovação.",
      },
      {
        label: "Validade definida",
        ok: Boolean(validUntil),
        help: "A validade evita orçamento antigo sendo aprovado depois.",
      },
      {
        label: "Pelo menos 1 item",
        ok: filledItems.length > 0,
        help: "Adicione o serviço, material ou etapa que será vendido.",
      },
      {
        label: "Total maior que zero",
        ok: total > 0,
        help: "Informe quantidade e preço para gerar uma proposta real.",
      },
    ],
    [customerId, filledItems.length, title, total, validUntil],
  );
  const nextBlocker = readiness.blockers[0] ?? null;
  const selectedCustomer =
    customers.find((customer) => customer.id === customerId) ?? quote.customer;
  const saveStatus: QuoteSaveStatus =
    operationState === "saving"
      ? "saving"
      : operationState === "error"
        ? "error"
        : isDirty
          ? "dirty"
          : "saved";
  const saving = pending || operationState === "saving";
  const visibleFieldErrors = {
    ...(showValidationErrors ? validation.fields : {}),
    ...serverFieldErrors,
  };
  const visibleItemErrors = showValidationErrors ? validation.items : {};
  const lastSavedLabel = lastSavedAt
    ? lastSavedAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  function updateItem(
    key: string,
    buildNext: (current: ItemDraft) => ItemDraft,
  ) {
    setItems((curr) =>
      curr.map((it) => (it.key === key ? buildNext(it) : it)),
    );
  }
  function removeItem(idx: number) {
    setItems((current) => {
      const item = current[idx];
      if (!item) return current;

      setRemovedItem(
        isPristineQuoteItem(item) ? null : { item: { ...item }, index: idx },
      );
      const next = current.filter((_, index) => index !== idx);
      return next.length > 0 ? next : [newDraft()];
    });
  }
  function undoRemoveItem() {
    if (!removedItem) return;
    setItems((current) => {
      const next =
        current.length === 1 && isPristineQuoteItem(current[0]!)
          ? []
          : [...current];
      next.splice(Math.min(removedItem.index, next.length), 0, removedItem.item);
      return next;
    });
    setRemovedItem(null);
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

  async function doSave(options: { quiet?: boolean } = {}): Promise<boolean> {
    setError(null);
    setServerFieldErrors({});

    if (!validation.valid) {
      setShowValidationErrors(true);
      focusDraftError(validation.firstTarget);
      return false;
    }

    if (currentSignature === savedSignature) return true;

    setOperationState("saving");

    const result = await updateQuoteAction(quote.id, {
      ...persistedDraft,
      valid_until: persistedDraft.valid_until || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setOperationState("error");
      if (result.fieldErrors) {
        const nextFieldErrors: Partial<Record<QuoteDraftField, string>> = {};
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (isQuoteDraftField(field) && messages?.[0]) {
            nextFieldErrors[field] = messages[0];
          }
        }
        setServerFieldErrors(nextFieldErrors);
        const firstServerField = Object.keys(nextFieldErrors).find(
          isQuoteDraftField,
        );
        if (firstServerField) {
          focusDraftError({ kind: "field", field: firstServerField });
        }
      }
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: result.error,
      });
      return false;
    }

    setSavedSignature(currentSignature);
    setLastSavedAt(new Date());
    setOperationState("idle");
    setShowValidationErrors(false);
    setRemovedItem(null);
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

  function focusDraftError(target: typeof validation.firstTarget) {
    if (!target) return;
    const fieldId =
      target.kind === "field"
        ? {
            title: "title",
            description: "description",
            customer_id: "customer",
            valid_until: "valid_until",
            notes: "notes",
            items: "quote-items",
          }[target.field]
        : {
            description: `description-${target.key}`,
            quantity: `qty-${target.key}`,
            unit: `unit-${target.key}`,
            unit_price_cents: `price-${target.key}`,
          }[target.field];

    setFocusTargetId(fieldId);
  }

  return (
    <div className="space-y-4">
      <ProtectedDraftNavigation dirty={isDirty} />

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
      <QuoteDetailsSection
        customers={customers}
        title={title}
        description={description}
        customerId={customerId}
        validUntil={validUntil}
        errors={visibleFieldErrors}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCustomerChange={setCustomerId}
        onValidUntilChange={setValidUntil}
      />

      <SendReadinessPanel
        ready={readiness.ready}
        blockers={readiness.blockers}
        checks={readinessChecks}
      />

      {/* ── Itens ──────────────────────────────────────────────── */}
      <QuoteItemsSection
        items={items}
        filledItemsCount={filledItems.length}
        totalCents={total}
        disabled={saving}
        errors={visibleItemErrors}
        sectionError={visibleFieldErrors.items}
        removedItem={removedItem}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onMoveItem={moveItem}
        onAddItem={addItem}
        onUndoRemove={undoRemoveItem}
      />

      <QuoteNotesSection
        notes={notes}
        error={visibleFieldErrors.notes}
        onChange={setNotes}
      />

      {error && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <QuoteSaveBar
        status={saveStatus}
        lastSavedLabel={lastSavedLabel}
        totalCents={total}
        ready={readiness.ready}
        nextBlocker={nextBlocker}
        onSave={onSave}
        saveDisabled={saving || !isDirty}
        sendAction={
          <SendQuoteButton
            quoteId={quote.id}
            quoteNumber={quote.number}
            quoteTitle={title}
            quoteTotalCents={total}
            customerName={selectedCustomer?.name}
            customerPhone={selectedCustomer?.phone}
            whatsappSentAt={quote.whatsapp_sent_at}
            onBeforeSend={() =>
              isDirty ? doSave({ quiet: true }) : Promise.resolve(true)
            }
            disabled={saving || !readiness.ready}
            label={
              revisionSource ? (
                <>
                  <span className="sm:hidden">Enviar revisão</span>
                  <span className="hidden sm:inline">
                    {isDirty ? "Salvar e enviar revisão" : "Enviar revisão"}
                  </span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Enviar WhatsApp</span>
                  <span className="hidden sm:inline">
                    {isDirty
                      ? "Salvar e enviar no WhatsApp"
                      : "Enviar no WhatsApp"}
                  </span>
                </>
              )
            }
            messageMode={revisionSource ? "revision" : "quote"}
            className="h-11 w-full px-3 sm:w-auto sm:min-w-[240px]"
          />
        }
      />
    </div>
  );
}

function isQuoteDraftField(value: string): value is QuoteDraftField {
  return [
    "title",
    "description",
    "customer_id",
    "valid_until",
    "notes",
    "items",
  ].includes(value);
}
