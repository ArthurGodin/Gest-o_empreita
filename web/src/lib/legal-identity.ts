import { z } from "zod";
import { isValidCpfCnpj, normalizeCpfCnpj } from "./br-documents";

export const legalIdentityFieldSchemas = {
  legalName: z.string().trim().min(2).max(160),
  legalDocument: z
    .string()
    .trim()
    .refine(isValidCpfCnpj, "CPF ou CNPJ inválido"),
  legalAddress: z.string().trim().min(5).max(300),
  supportEmail: z.string().trim().email().max(254),
  docsUpdatedAt: z
    .string()
    .trim()
    .refine(isValidIsoDate, "Data inválida"),
} as const;

export type LegalIdentityField = keyof typeof legalIdentityFieldSchemas;

export interface LegalIdentityInput {
  legalName?: string;
  legalDocument?: string;
  legalAddress?: string;
  supportEmail?: string;
  docsUpdatedAt?: string;
}

export interface PublicLegalIdentity {
  legalName: string;
  documentType: "CPF" | "CNPJ";
  formattedDocument: string;
  legalAddress: string;
  supportEmail: string;
  docsUpdatedAt: string;
  formattedDocsUpdatedAt: string;
}

export interface LegalIdentityState {
  complete: boolean;
  missingFields: LegalIdentityField[];
  invalidFields: LegalIdentityField[];
  supportEmail: string | null;
  publicIdentity: PublicLegalIdentity | null;
}

export function buildLegalIdentity(
  input: LegalIdentityInput,
): LegalIdentityState {
  const values: Record<LegalIdentityField, string | undefined> = {
    legalName: input.legalName,
    legalDocument: input.legalDocument,
    legalAddress: input.legalAddress,
    supportEmail: input.supportEmail,
    docsUpdatedAt: input.docsUpdatedAt,
  };
  const parsedValues: Partial<Record<LegalIdentityField, string>> = {};
  const missingFields: LegalIdentityField[] = [];
  const invalidFields: LegalIdentityField[] = [];

  for (const field of Object.keys(values) as LegalIdentityField[]) {
    const rawValue = values[field];
    if (!rawValue?.trim()) {
      missingFields.push(field);
      continue;
    }

    const result = legalIdentityFieldSchemas[field].safeParse(rawValue);
    if (!result.success) {
      invalidFields.push(field);
      continue;
    }

    parsedValues[field] = result.data;
  }

  const supportEmail = parsedValues.supportEmail ?? null;
  const complete = missingFields.length === 0 && invalidFields.length === 0;

  if (!complete) {
    return {
      complete,
      missingFields,
      invalidFields,
      supportEmail,
      publicIdentity: null,
    };
  }

  const legalName = parsedValues.legalName!;
  const legalDocument = normalizeCpfCnpj(parsedValues.legalDocument);
  const legalAddress = parsedValues.legalAddress!;
  const docsUpdatedAt = parsedValues.docsUpdatedAt!;

  return {
    complete,
    missingFields,
    invalidFields,
    supportEmail,
    publicIdentity: {
      legalName,
      documentType: legalDocument.length === 11 ? "CPF" : "CNPJ",
      formattedDocument: formatLegalDocument(legalDocument),
      legalAddress,
      supportEmail: supportEmail!,
      docsUpdatedAt,
      formattedDocsUpdatedAt: formatIsoDatePtBr(docsUpdatedAt),
    },
  };
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatLegalDocument(digits: string): string {
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatIsoDatePtBr(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
