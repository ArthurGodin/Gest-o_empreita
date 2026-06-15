import "server-only";

import QRCode from "qrcode";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysBR } from "@/lib/dates";
import { createPixBrCode, type PixKeyType } from "@/lib/pix/br-code";
import type { Database, PaymentProvider } from "@/lib/supabase/types";
import type { CreateChargeResult } from "./asaas";

type SupabaseServer = SupabaseClient<Database>;

export interface CompanyPaymentSettings {
  payment_provider: PaymentProvider;
  pix_key_type: PixKeyType | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  pix_receiver_city: string | null;
  pix_instructions: string | null;
}

export async function getCompanyPaymentSettings(
  supabase: SupabaseServer,
  companyId: string,
): Promise<CompanyPaymentSettings> {
  const { data, error } = await supabase
    .from("companies")
    .select(
      "payment_provider, pix_key_type, pix_key, pix_receiver_name, pix_receiver_city, pix_instructions",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Empresa não encontrada.");

  return data as CompanyPaymentSettings;
}

export function isManualPixReady(settings: CompanyPaymentSettings): boolean {
  return (
    settings.payment_provider === "manual_pix"
    && !!settings.pix_key_type
    && !!settings.pix_key?.trim()
    && !!settings.pix_receiver_name?.trim()
    && !!settings.pix_receiver_city?.trim()
  );
}

export async function generateManualPixForCharge(
  supabase: SupabaseServer,
  params: {
    chargeId: string;
    companyId: string;
    description: string;
  },
): Promise<CreateChargeResult> {
  const [settings, chargeRes] = await Promise.all([
    getCompanyPaymentSettings(supabase, params.companyId),
    supabase
      .from("billing_charges")
      .select("id, amount_cents, due_date, status, pix_qr_code")
      .eq("id", params.chargeId)
      .eq("company_id", params.companyId)
      .maybeSingle(),
  ]);

  if (chargeRes.error) throw chargeRes.error;
  if (!chargeRes.data) throw new Error("Cobrança não encontrada.");
  if (!isManualPixReady(settings)) {
    return {
      ok: true,
      chargeId: params.chargeId,
      warning:
        "Configure a chave Pix da empresa em Configurações para gerar esta cobrança.",
    };
  }

  const charge = chargeRes.data as {
    id: string;
    amount_cents: number;
    due_date: string | null;
    status: string;
    pix_qr_code: string | null;
  };

  if (charge.pix_qr_code && charge.status !== "draft") {
    return { ok: true, chargeId: charge.id };
  }

  const payload = createPixBrCode({
    key: settings.pix_key!,
    keyType: settings.pix_key_type!,
    receiverName: settings.pix_receiver_name!,
    receiverCity: settings.pix_receiver_city!,
    amountCents: charge.amount_cents,
    txid: charge.id,
    description: params.description,
  });
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
  });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const dueDate = charge.due_date ?? addDaysBR(7);

  const { error: updateError } = await supabase
    .from("billing_charges")
    .update({
      status: "pending",
      payment_provider: "manual_pix",
      due_date: dueDate,
      asaas_payment_id: null,
      invoice_url: null,
      pix_qr_code: payload,
      pix_qr_image_b64: qrBase64,
    })
    .eq("id", charge.id)
    .eq("company_id", params.companyId);

  if (updateError) throw updateError;
  return { ok: true, chargeId: charge.id };
}

export async function markManualPixChargePaid(
  supabase: SupabaseServer,
  params: {
    chargeId: string;
    companyId: string;
    userId: string;
    note?: string | null;
  },
): Promise<{ projectId: string }> {
  const paidAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("billing_charges")
    .update({
      status: "received",
      paid_at: paidAt,
      paid_manually_at: paidAt,
      paid_manually_by: params.userId,
      manual_payment_note: params.note?.trim() || null,
    })
    .eq("id", params.chargeId)
    .eq("company_id", params.companyId)
    .eq("payment_provider", "manual_pix")
    .in("status", ["draft", "pending", "overdue"])
    .select("project_id")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Cobrança manual não encontrada ou já finalizada.");
  }

  return { projectId: data.project_id as string };
}
