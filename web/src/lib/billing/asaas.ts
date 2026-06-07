import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysBR } from "@/lib/dates";
import { createAsaasCustomer } from "@/lib/asaas/customers";
import { AsaasConfigError } from "@/lib/asaas/client";
import { createPixPayment, getPixQrCode } from "@/lib/asaas/payments";
import type { ChargeKind, Database } from "@/lib/supabase/types";

type SupabaseServer = SupabaseClient<Database>;

export interface BillingCustomer {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
}

export interface LocalChargeInput {
  projectId: string;
  companyId: string;
  customerId: string;
  totalCents: number;
  entryPct: number;
}

export interface CreateChargeResult {
  ok: true;
  chargeId: string | null;
  warning?: string;
}

export function normalizeCpfCnpj(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidCpfCnpjLength(value: string | null | undefined): boolean {
  const digits = normalizeCpfCnpj(value);
  return digits.length === 11 || digits.length === 14;
}

export async function ensureBillingProfile(
  supabase: SupabaseServer,
  companyId: string,
  customer: BillingCustomer,
  cpfCnpjOverride?: string | null,
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from("customer_billing_profiles")
    .select("asaas_customer_id")
    .eq("customer_id", customer.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.asaas_customer_id) return existing.asaas_customer_id;

  const cpfCnpj = normalizeCpfCnpj(cpfCnpjOverride || customer.document);
  if (!isValidCpfCnpjLength(cpfCnpj)) {
    throw new Error("CPF/CNPJ obrigatório para gerar cobrança Pix.");
  }

  const asaasCustomer = await createAsaasCustomer({
    name: customer.name,
    cpfCnpj,
    email: customer.email,
    mobilePhone: customer.phone,
    externalReference: customer.id,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("customer_billing_profiles")
    .insert({
      company_id: companyId,
      customer_id: customer.id,
      asaas_customer_id: asaasCustomer.id,
      cpf_cnpj: cpfCnpj,
    })
    .select("asaas_customer_id")
    .maybeSingle();

  if (!insertError && inserted?.asaas_customer_id) {
    return inserted.asaas_customer_id;
  }

  // Corrida de double-click: outra request criou o perfil antes.
  if (insertError?.code === "23505") {
    const { data: afterRace, error: afterRaceError } = await supabase
      .from("customer_billing_profiles")
      .select("asaas_customer_id")
      .eq("customer_id", customer.id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (afterRaceError) throw afterRaceError;
    if (afterRace?.asaas_customer_id) return afterRace.asaas_customer_id;
  }

  throw insertError ?? new Error("Não foi possível criar cliente no Asaas.");
}

export async function createLocalCharges(
  supabase: SupabaseServer,
  input: LocalChargeInput,
): Promise<{ entryChargeId: string | null; saldoChargeId: string | null }> {
  const entryCents = Math.round((input.totalCents * input.entryPct) / 100);
  const saldoCents = input.totalCents - entryCents;
  let entryChargeId: string | null = null;
  let saldoChargeId: string | null = null;

  if (entryCents > 0) {
    entryChargeId = await upsertDraftCharge(supabase, {
      kind: "entrada",
      amountCents: entryCents,
      dueDate: addDaysBR(7),
      ...input,
    });
  }

  if (saldoCents > 0) {
    saldoChargeId = await upsertDraftCharge(supabase, {
      kind: "saldo",
      amountCents: saldoCents,
      dueDate: null,
      ...input,
    });
  }

  return { entryChargeId, saldoChargeId };
}

export async function generatePixForCharge(
  supabase: SupabaseServer,
  params: {
    chargeId: string;
    companyId: string;
    customer: BillingCustomer;
    cpfCnpjOverride?: string | null;
    description: string;
  },
): Promise<CreateChargeResult> {
  const { data: charge, error: chargeError } = await supabase
    .from("billing_charges")
    .select("id, amount_cents, due_date, asaas_payment_id, status")
    .eq("id", params.chargeId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (chargeError) throw chargeError;
  if (!charge) throw new Error("Cobrança não encontrada.");

  if (charge.asaas_payment_id && charge.status !== "draft") {
    return { ok: true, chargeId: charge.id };
  }

  try {
    const asaasCustomerId = await ensureBillingProfile(
      supabase,
      params.companyId,
      params.customer,
      params.cpfCnpjOverride,
    );
    const dueDate = charge.due_date ?? addDaysBR(7);
    const payment = await createPixPayment({
      customer: asaasCustomerId,
      valueCents: charge.amount_cents,
      dueDate,
      description: params.description,
      externalReference: charge.id,
    });
    const qrCode = await getPixQrCode(payment.id);

    const { error: updateError } = await supabase
      .from("billing_charges")
      .update({
        status: "pending",
        due_date: dueDate,
        asaas_payment_id: payment.id,
        invoice_url: payment.invoiceUrl,
        pix_qr_code: qrCode.payload,
        pix_qr_image_b64: qrCode.encodedImage,
      })
      .eq("id", charge.id)
      .eq("company_id", params.companyId);

    if (updateError) throw updateError;
    return { ok: true, chargeId: charge.id };
  } catch (error) {
    if (error instanceof AsaasConfigError) {
      return {
        ok: true,
        chargeId: charge.id,
        warning: "Asaas ainda não configurado. A cobrança ficou como rascunho.",
      };
    }
    throw error;
  }
}

async function upsertDraftCharge(
  supabase: SupabaseServer,
  input: LocalChargeInput & {
    kind: ChargeKind;
    amountCents: number;
    dueDate: string | null;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("billing_charges")
    .upsert(
      {
        project_id: input.projectId,
        company_id: input.companyId,
        customer_id: input.customerId,
        kind: input.kind,
        status: "draft",
        amount_cents: input.amountCents,
        due_date: input.dueDate,
      },
      { onConflict: "project_id,kind", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
