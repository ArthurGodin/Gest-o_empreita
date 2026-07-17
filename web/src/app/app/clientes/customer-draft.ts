import { isValidCpfCnpj, normalizeCpfCnpj } from "@/lib/br-documents";
import { formDraftSignature } from "@/lib/form-draft";
import type { Customer } from "@/lib/queries/customers";

export interface CustomerDraft {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
}

export type CustomerDraftField = keyof CustomerDraft;

export interface CustomerDraftValidation {
  valid: boolean;
  errors: Partial<Record<CustomerDraftField, string>>;
  firstField: CustomerDraftField | null;
}

export function initialCustomerDraft(customer?: Customer): CustomerDraft {
  return {
    name: customer?.name ?? "",
    document: customer?.document ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    zip_code: customer?.zip_code ?? "",
    notes: customer?.notes ?? "",
  };
}

export function normalizedCustomerDraft(draft: CustomerDraft): CustomerDraft {
  return {
    name: draft.name.trim(),
    document: normalizeCpfCnpj(draft.document),
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    address: draft.address.trim(),
    city: draft.city.trim(),
    state: draft.state.trim().toUpperCase(),
    zip_code: draft.zip_code.trim(),
    notes: draft.notes.trim(),
  };
}

export function customerDraftSignature(draft: CustomerDraft): string {
  return formDraftSignature(normalizedCustomerDraft(draft));
}

export function customerDraftFormData(draft: CustomerDraft): FormData {
  const data = new FormData();
  const normalized = normalizedCustomerDraft(draft);
  for (const [key, value] of Object.entries(normalized)) {
    data.set(key, value);
  }
  return data;
}

export function validateCustomerDraft(
  draft: CustomerDraft,
): CustomerDraftValidation {
  const errors: CustomerDraftValidation["errors"] = {};
  let firstField: CustomerDraftField | null = null;

  function add(field: CustomerDraftField, message: string) {
    errors[field] = message;
    firstField ??= field;
  }

  const normalized = normalizedCustomerDraft(draft);
  if (normalized.name.length < 2) {
    add("name", "Informe o nome do cliente com pelo menos 2 caracteres.");
  }
  if (normalized.document && !isValidCpfCnpj(normalized.document)) {
    add("document", "Informe um CPF ou CNPJ válido.");
  }
  if (
    normalized.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  ) {
    add("email", "Informe um email válido.");
  }
  if (normalized.state.length > 2) {
    add("state", "UF deve ter no máximo 2 letras.");
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstField,
  };
}
