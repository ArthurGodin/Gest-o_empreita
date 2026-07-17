import { isValidCpfCnpj } from "@/lib/br-documents";
import { formDraftSignature } from "@/lib/form-draft";
import { normalizePixKey } from "@/lib/pix/br-code";
import type { CompanyFull } from "@/lib/queries/company-settings";
import type { PaymentProvider, PixKeyType } from "@/lib/supabase/types";

export interface PaymentSettingsDraft {
  payment_provider: PaymentProvider;
  pix_key_type: PixKeyType;
  pix_key: string;
  pix_receiver_name: string;
  pix_receiver_city: string;
  pix_instructions: string;
}

export type PaymentSettingsDraftField = keyof PaymentSettingsDraft;

export function initialPaymentSettingsDraft(
  company: CompanyFull,
): PaymentSettingsDraft {
  return {
    payment_provider: company.payment_provider ?? "asaas",
    pix_key_type: company.pix_key_type ?? "random",
    pix_key: company.pix_key ?? "",
    pix_receiver_name: company.pix_receiver_name ?? company.name,
    pix_receiver_city: company.pix_receiver_city ?? company.city ?? "",
    pix_instructions: company.pix_instructions ?? "",
  };
}

export function normalizedPaymentSettingsDraft(draft: PaymentSettingsDraft) {
  if (draft.payment_provider === "asaas") {
    return {
      payment_provider: draft.payment_provider,
      pix_key_type: null,
      pix_key: "",
      pix_receiver_name: "",
      pix_receiver_city: "",
      pix_instructions: "",
    };
  }

  return {
    payment_provider: draft.payment_provider,
    pix_key_type: draft.pix_key_type,
    pix_key: normalizePixKey(draft.pix_key, draft.pix_key_type),
    pix_receiver_name: draft.pix_receiver_name.trim(),
    pix_receiver_city: draft.pix_receiver_city.trim(),
    pix_instructions: draft.pix_instructions.trim(),
  };
}

export function paymentSettingsDraftSignature(
  draft: PaymentSettingsDraft,
): string {
  return formDraftSignature(normalizedPaymentSettingsDraft(draft));
}

export function paymentSettingsPayload(draft: PaymentSettingsDraft) {
  return {
    payment_provider: draft.payment_provider,
    pix_key_type: draft.pix_key_type,
    pix_key: draft.pix_key,
    pix_receiver_name: draft.pix_receiver_name,
    pix_receiver_city: draft.pix_receiver_city,
    pix_instructions: draft.pix_instructions,
  };
}

export function validatePaymentSettingsDraft(draft: PaymentSettingsDraft) {
  const errors: Partial<Record<PaymentSettingsDraftField, string>> = {};
  let firstField: PaymentSettingsDraftField | null = null;

  function add(field: PaymentSettingsDraftField, message: string) {
    errors[field] = message;
    firstField ??= field;
  }

  if (draft.payment_provider !== "manual_pix") {
    return { valid: true, errors, firstField };
  }

  const key = normalizePixKey(draft.pix_key, draft.pix_key_type);
  if (!key) {
    add("pix_key", "Informe a chave Pix.");
  } else if (
    draft.pix_key_type === "cpf" &&
    (key.length !== 11 || !isValidCpfCnpj(key))
  ) {
    add("pix_key", "CPF da chave Pix inválido.");
  } else if (
    draft.pix_key_type === "cnpj" &&
    (key.length !== 14 || !isValidCpfCnpj(key))
  ) {
    add("pix_key", "CNPJ da chave Pix inválido.");
  } else if (
    draft.pix_key_type === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
  ) {
    add("pix_key", "Email da chave Pix inválido.");
  } else if (draft.pix_key_type === "phone" && key.length < 12) {
    add("pix_key", "Telefone Pix precisa incluir DDD.");
  } else if (draft.pix_key_type === "random" && key.length < 8) {
    add("pix_key", "Chave aleatória muito curta.");
  }

  if (!draft.pix_receiver_name.trim()) {
    add("pix_receiver_name", "Informe o nome que aparece no banco.");
  }
  if (!draft.pix_receiver_city.trim()) {
    add("pix_receiver_city", "Informe a cidade do recebedor.");
  }
  if (draft.pix_receiver_name.trim().length > 80) {
    add("pix_receiver_name", "Use no máximo 80 caracteres.");
  }
  if (draft.pix_receiver_city.trim().length > 80) {
    add("pix_receiver_city", "Use no máximo 80 caracteres.");
  }
  if (draft.pix_instructions.trim().length > 500) {
    add("pix_instructions", "Use no máximo 500 caracteres.");
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstField,
  };
}
