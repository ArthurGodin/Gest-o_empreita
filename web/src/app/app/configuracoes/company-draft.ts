import { formDraftSignature } from "@/lib/form-draft";
import type { CompanyFull } from "@/lib/queries/company-settings";
import { isBrazilStateCode } from "@/lib/brazil-states";

export interface CompanyDraft {
  name: string;
  legal_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export type CompanyDraftField = keyof CompanyDraft;

export function initialCompanyDraft(company: CompanyFull): CompanyDraft {
  return {
    name: company.name,
    legal_name: company.legal_name ?? "",
    cnpj: company.cnpj ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip_code: company.zip_code ?? "",
  };
}

export function normalizedCompanyDraft(draft: CompanyDraft): CompanyDraft {
  return {
    name: draft.name.trim(),
    legal_name: draft.legal_name.trim(),
    cnpj: draft.cnpj.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    address: draft.address.trim(),
    city: draft.city.trim(),
    state: draft.state.trim().toUpperCase(),
    zip_code: draft.zip_code.trim(),
  };
}

export function companyDraftSignature(draft: CompanyDraft): string {
  return formDraftSignature(normalizedCompanyDraft(draft));
}

export function validateCompanyDraft(draft: CompanyDraft) {
  const errors: Partial<Record<CompanyDraftField, string>> = {};
  let firstField: CompanyDraftField | null = null;

  function add(field: CompanyDraftField, message: string) {
    errors[field] = message;
    firstField ??= field;
  }

  const normalized = normalizedCompanyDraft(draft);
  if (normalized.name.length < 2) {
    add("name", "Informe o nome da empresa com pelo menos 2 caracteres.");
  }
  if (
    normalized.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  ) {
    add("email", "Informe um email válido.");
  }
  if (normalized.state && !isBrazilStateCode(normalized.state)) {
    add("state", "Selecione uma UF valida.");
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstField,
  };
}
