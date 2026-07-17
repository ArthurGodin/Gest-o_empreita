import { normalizeQuoteUnit } from "@/lib/format";

export const QUOTE_DRAFT_LIMITS = {
  title: 200,
  description: 5_000,
  notes: 5_000,
  itemDescription: 500,
  unit: 10,
  quantity: 1_000_000,
  unitPriceCents: 100_000_000_000,
  items: 200,
} as const;

export interface ItemDraft {
  key: string;
  catalog_item_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price_cents: number;
}

export interface QuoteDraft {
  title: string;
  description: string;
  customer_id: string;
  valid_until: string;
  notes: string;
  items: ItemDraft[];
}

export interface PersistedQuoteItemDraft {
  description: string;
  unit: string;
  quantity: number;
  unit_price_cents: number;
}

export interface PersistedQuoteDraft {
  title: string;
  description: string;
  customer_id: string;
  valid_until: string;
  notes: string;
  items: PersistedQuoteItemDraft[];
}

export type QuoteDraftField =
  | "title"
  | "description"
  | "customer_id"
  | "valid_until"
  | "notes"
  | "items";

export type QuoteDraftItemField =
  | "description"
  | "unit"
  | "quantity"
  | "unit_price_cents";

export interface QuoteDraftValidation {
  valid: boolean;
  fields: Partial<Record<QuoteDraftField, string>>;
  items: Record<string, Partial<Record<QuoteDraftItemField, string>>>;
  firstTarget:
    | { kind: "field"; field: QuoteDraftField }
    | { kind: "item"; key: string; field: QuoteDraftItemField }
    | null;
}

export function isPristineQuoteItem(item: ItemDraft): boolean {
  return (
    item.description.trim() === "" &&
    normalizeQuoteUnit(item.unit) === "un" &&
    item.quantity === 1 &&
    item.unit_price_cents === 0
  );
}

export function toPersistedQuoteDraft(draft: QuoteDraft): PersistedQuoteDraft {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    customer_id: draft.customer_id,
    valid_until: draft.valid_until,
    notes: draft.notes.trim(),
    items: draft.items
      .filter((item) => !isPristineQuoteItem(item))
      .map((item) => ({
        description: item.description.trim(),
        unit: normalizeQuoteUnit(item.unit),
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
      })),
  };
}

export function quoteDraftSignature(draft: QuoteDraft): string {
  return JSON.stringify(toPersistedQuoteDraft(draft));
}

export function validateQuoteDraft(draft: QuoteDraft): QuoteDraftValidation {
  const fields: QuoteDraftValidation["fields"] = {};
  const items: QuoteDraftValidation["items"] = {};
  let firstTarget: QuoteDraftValidation["firstTarget"] = null;

  function addFieldError(field: QuoteDraftField, message: string) {
    fields[field] = message;
    firstTarget ??= { kind: "field", field };
  }

  function addItemError(
    key: string,
    field: QuoteDraftItemField,
    message: string,
  ) {
    items[key] ??= {};
    items[key]![field] = message;
    firstTarget ??= { kind: "item", key, field };
  }

  const title = draft.title.trim();
  if (!title) {
    addFieldError("title", "Informe um título para identificar o orçamento.");
  } else if (title.length > QUOTE_DRAFT_LIMITS.title) {
    addFieldError(
      "title",
      `Use no máximo ${QUOTE_DRAFT_LIMITS.title} caracteres.`,
    );
  }

  if (!draft.customer_id) {
    addFieldError("customer_id", "Escolha o cliente deste orçamento.");
  }

  if (draft.valid_until && !/^\d{4}-\d{2}-\d{2}$/.test(draft.valid_until)) {
    addFieldError("valid_until", "Informe uma data válida.");
  }

  if (draft.description.trim().length > QUOTE_DRAFT_LIMITS.description) {
    addFieldError(
      "description",
      `Use no máximo ${QUOTE_DRAFT_LIMITS.description} caracteres.`,
    );
  }

  if (draft.notes.trim().length > QUOTE_DRAFT_LIMITS.notes) {
    addFieldError(
      "notes",
      `Use no máximo ${QUOTE_DRAFT_LIMITS.notes} caracteres.`,
    );
  }

  const candidateItems = draft.items.filter(
    (item) => !isPristineQuoteItem(item),
  );
  if (candidateItems.length > QUOTE_DRAFT_LIMITS.items) {
    addFieldError(
      "items",
      `Use no máximo ${QUOTE_DRAFT_LIMITS.items} itens por orçamento.`,
    );
  }

  for (const item of candidateItems) {
    const description = item.description.trim();
    const unit = normalizeQuoteUnit(item.unit);

    if (!description) {
      addItemError(
        item.key,
        "description",
        "Descreva este item ou remova a linha.",
      );
    } else if (description.length > QUOTE_DRAFT_LIMITS.itemDescription) {
      addItemError(
        item.key,
        "description",
        `Use no máximo ${QUOTE_DRAFT_LIMITS.itemDescription} caracteres.`,
      );
    }

    if (unit.length > QUOTE_DRAFT_LIMITS.unit) {
      addItemError(
        item.key,
        "unit",
        `Use no máximo ${QUOTE_DRAFT_LIMITS.unit} caracteres.`,
      );
    }

    if (
      !Number.isFinite(item.quantity) ||
      item.quantity < 0 ||
      item.quantity > QUOTE_DRAFT_LIMITS.quantity
    ) {
      addItemError(
        item.key,
        "quantity",
        "Informe uma quantidade entre 0 e 1.000.000.",
      );
    }

    if (
      !Number.isInteger(item.unit_price_cents) ||
      item.unit_price_cents < 0 ||
      item.unit_price_cents > QUOTE_DRAFT_LIMITS.unitPriceCents
    ) {
      addItemError(
        item.key,
        "unit_price_cents",
        "Informe um preço válido e não negativo.",
      );
    }
  }

  return {
    valid: Object.keys(fields).length === 0 && Object.keys(items).length === 0,
    fields,
    items,
    firstTarget,
  };
}
