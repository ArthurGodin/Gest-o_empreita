export interface TemplateItemDraft {
  key: string;
  name: string;
  estDays: string;
}

export interface TemplateDraft {
  name: string;
  description: string;
  items: TemplateItemDraft[];
}

export interface TemplateDraftErrors {
  name?: string;
  description?: string;
  items?: Record<string, { name?: string; estDays?: string }>;
}

export interface TemplateDraftValidation {
  ok: boolean;
  errors: TemplateDraftErrors;
  firstFieldId: string | null;
}

export function initialTemplateDraft(
  name = "",
  description = "",
  items: Array<{ name: string; est_days: number | null }> = [
    { name: "", est_days: null },
  ],
): TemplateDraft {
  return {
    name,
    description,
    items: items.map((item, index) => ({
      key: `initial-${index}`,
      name: item.name,
      estDays: item.est_days?.toString() ?? "",
    })),
  };
}

export function templateDraftSignature(draft: TemplateDraft): string {
  return JSON.stringify({
    name: draft.name,
    description: draft.description,
    items: draft.items.map(({ name, estDays }) => ({ name, estDays })),
  });
}

export function validateTemplateDraft(
  draft: TemplateDraft,
): TemplateDraftValidation {
  const errors: TemplateDraftErrors = {};
  let firstFieldId: string | null = null;

  function mark(fieldId: string) {
    firstFieldId ??= fieldId;
  }

  const trimmedName = draft.name.trim();
  if (!trimmedName) {
    errors.name = "Informe o nome do modelo.";
    mark("template-name");
  } else if (trimmedName.length > 100) {
    errors.name = "Use no máximo 100 caracteres.";
    mark("template-name");
  }

  if (draft.description.trim().length > 500) {
    errors.description = "Use no máximo 500 caracteres.";
    mark("template-description");
  }

  if (draft.items.length === 0) {
    errors.items = {};
    mark("add-template-item");
  }

  if (draft.items.length > 30) {
    errors.items = {};
    mark(`template-item-name-${draft.items[30]?.key ?? draft.items[0]?.key}`);
  }

  for (const item of draft.items.slice(0, 30)) {
    const itemErrors: { name?: string; estDays?: string } = {};
    const trimmedItemName = item.name.trim();
    if (!trimmedItemName) {
      itemErrors.name = "Informe o nome da etapa.";
      mark(`template-item-name-${item.key}`);
    } else if (trimmedItemName.length > 200) {
      itemErrors.name = "Use no máximo 200 caracteres.";
      mark(`template-item-name-${item.key}`);
    }

    if (item.estDays !== "") {
      const days = Number(item.estDays);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        itemErrors.estDays = "Informe de 1 a 365 dias.";
        mark(`template-item-days-${item.key}`);
      }
    }

    if (Object.keys(itemErrors).length > 0) {
      errors.items ??= {};
      errors.items[item.key] = itemErrors;
    }
  }

  return {
    ok: firstFieldId === null,
    errors,
    firstFieldId,
  };
}

export function templateDraftPayload(draft: TemplateDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    items: draft.items.map((item) => ({
      name: item.name.trim(),
      est_days: item.estDays === "" ? null : Number(item.estDays),
    })),
  };
}
