import type { CostCategory } from "@/lib/supabase/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface StageDraft {
  name: string;
  days: string;
}

export interface CostDraft {
  category: CostCategory;
  description: string;
  amount: string;
  incurredOn: string;
  stageId: string;
}

export interface TimeDraft {
  workerName: string;
  workerRole: string;
  startedAt: string;
  endedAt: string;
  workedOn: string;
  notes: string;
}

export function projectCommandSignature(value: object): string {
  return JSON.stringify(value);
}

export function parseBRLToCents(input: string): number | null {
  const compact = input.replace(/\s/g, "");
  if (!compact || !/^-?[\d.,]+$/.test(compact)) return null;

  const commaCount = (compact.match(/,/g) ?? []).length;
  const dotCount = (compact.match(/\./g) ?? []).length;
  if (commaCount > 1) return null;

  let normalized: string;
  if (commaCount === 1) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else if (dotCount === 1 && /\.\d{1,2}$/.test(compact)) {
    normalized = compact;
  } else {
    normalized = compact.replace(/\./g, "");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function validateStageDraft(draft: StageDraft) {
  const errors: Partial<Record<keyof StageDraft, string>> = {};
  if (!draft.name.trim()) errors.name = "Informe o nome da etapa.";
  else if (draft.name.trim().length > 200) {
    errors.name = "Use no máximo 200 caracteres.";
  }

  if (draft.days !== "") {
    const days = Number(draft.days);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      errors.days = "Informe de 1 a 365 dias.";
    }
  }

  return errors;
}

export function validateCostDraft(draft: CostDraft) {
  const errors: Partial<Record<keyof CostDraft, string>> = {};
  if (!draft.description.trim()) errors.description = "Informe a descrição.";
  else if (draft.description.trim().length > 200) {
    errors.description = "Use no máximo 200 caracteres.";
  }

  const amountCents = parseBRLToCents(draft.amount);
  if (amountCents === null || amountCents <= 0) {
    errors.amount = "Informe um valor maior que zero.";
  } else if (amountCents > 100_000_000) {
    errors.amount = "O valor máximo por lançamento é R$ 1.000.000,00.";
  }

  if (!DATE_PATTERN.test(draft.incurredOn)) {
    errors.incurredOn = "Informe uma data válida.";
  }

  return errors;
}

export function validateTimeDraft(draft: TimeDraft) {
  const errors: Partial<Record<keyof TimeDraft, string>> = {};
  if (!draft.workerName.trim()) errors.workerName = "Informe o nome do profissional.";
  else if (draft.workerName.trim().length > 100) {
    errors.workerName = "Use no máximo 100 caracteres.";
  }

  if (draft.workerRole.trim().length > 50) {
    errors.workerRole = "Use no máximo 50 caracteres.";
  }
  if (!TIME_PATTERN.test(draft.startedAt)) {
    errors.startedAt = "Informe uma hora de entrada válida.";
  }
  if (draft.endedAt && !TIME_PATTERN.test(draft.endedAt)) {
    errors.endedAt = "Informe uma hora de saída válida.";
  }
  if (!DATE_PATTERN.test(draft.workedOn)) {
    errors.workedOn = "Informe uma data válida.";
  }
  if (draft.notes.trim().length > 500) {
    errors.notes = "Use no máximo 500 caracteres.";
  }

  return errors;
}
