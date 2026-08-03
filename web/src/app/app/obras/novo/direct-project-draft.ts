import type { ActivationGoal } from "@/lib/activation-goals";
import { isValidCpfCnpj, normalizeCpfCnpj } from "@/lib/br-documents";
import { isBrazilStateCode } from "@/lib/brazil-states";
import { parseBRLToCents } from "@/lib/format";
import type { Customer } from "@/lib/queries/customers";

export type DirectProjectCustomerMode = "existing" | "new";
export type DirectProjectStatus = "planning" | "in_progress";

export interface DirectProjectDraft {
  goal: ActivationGoal;
  customerMode: DirectProjectCustomerMode;
  existingCustomerId: string;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerZipCode: string;
  projectName: string;
  projectDescription: string;
  projectAddress: string;
  projectStatus: DirectProjectStatus;
  startsOn: string;
  endsOn: string;
  budget: string;
  templateId: string;
}

export type DirectProjectDraftField = Exclude<keyof DirectProjectDraft, "goal">;

export interface DirectProjectDraftValidation {
  valid: boolean;
  errors: Partial<Record<DirectProjectDraftField, string>>;
  firstField: DirectProjectDraftField | null;
  budgetCents: number | null;
}

export function initialDirectProjectDraft(
  goal: ActivationGoal,
  customers: Customer[],
): DirectProjectDraft {
  return {
    goal,
    customerMode: customers.length > 0 ? "existing" : "new",
    existingCustomerId: customers[0]?.id ?? "",
    customerName: "",
    customerDocument: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    customerCity: "",
    customerState: "",
    customerZipCode: "",
    projectName: "",
    projectDescription: "",
    projectAddress: "",
    projectStatus: "planning",
    startsOn: "",
    endsOn: "",
    budget: "",
    templateId: "",
  };
}

export function validateDirectProjectDraft(
  draft: DirectProjectDraft,
): DirectProjectDraftValidation {
  const errors: DirectProjectDraftValidation["errors"] = {};
  let firstField: DirectProjectDraftField | null = null;

  function add(field: DirectProjectDraftField, message: string) {
    errors[field] = message;
    firstField ??= field;
  }

  if (draft.customerMode === "existing") {
    if (!draft.existingCustomerId) {
      add("existingCustomerId", "Escolha um cliente.");
    }
  } else {
    if (draft.customerName.trim().length < 2) {
      add("customerName", "Informe o nome do cliente.");
    }
    const document = normalizeCpfCnpj(draft.customerDocument);
    if (document && !isValidCpfCnpj(document)) {
      add("customerDocument", "Informe um CPF ou CNPJ válido.");
    }
    const email = draft.customerEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      add("customerEmail", "Informe um email válido.");
    }
    const state = draft.customerState.trim();
    if (state && !isBrazilStateCode(state)) {
      add("customerState", "Informe uma UF válida.");
    }
  }

  if (draft.projectName.trim().length < 2) {
    add("projectName", "Informe o nome do trabalho.");
  }
  if (draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn) {
    add("endsOn", "A data final deve ser posterior ao início.");
  }

  const budgetCents = parseBRLToCents(draft.budget);
  if (draft.budget.trim() && budgetCents === null) {
    add("budget", "Informe um valor válido, como 12.500,00.");
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstField,
    budgetCents,
  };
}

export function isDirectProjectDraftDirty(draft: DirectProjectDraft): boolean {
  return Boolean(
    draft.projectName.trim() ||
      draft.projectDescription.trim() ||
      draft.projectAddress.trim() ||
      draft.startsOn ||
      draft.endsOn ||
      draft.budget.trim() ||
      draft.templateId ||
      (draft.customerMode === "new" &&
        (draft.customerName.trim() ||
          draft.customerDocument.trim() ||
          draft.customerPhone.trim() ||
          draft.customerEmail.trim() ||
          draft.customerAddress.trim() ||
          draft.customerCity.trim() ||
          draft.customerState.trim() ||
          draft.customerZipCode.trim())),
  );
}
