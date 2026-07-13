"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { generateShareToken } from "@/lib/quote-token";
import { env } from "@/lib/env";
import { type SendQuoteResult } from "./send";

// ─── Schemas ───────────────────────────────────────────────────────────────

function publicQuoteUrl(token: string) {
  return `${env.NEXT_PUBLIC_APP_URL}/q/${token}`;
}

function isMissingWhatsappSentColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string };
  const text = `${err?.message ?? ""} ${err?.details ?? ""}`;
  return (
    err?.code === "42703" ||
    err?.code === "PGRST204" ||
    text.includes("whatsapp_sent_at")
  );
}

// ─── Revoke share token (gera novo) ────────────────────────────────────────

export async function revokeShareTokenAction(id: string): Promise<SendQuoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const supabase = createClient();
  const newToken = generateShareToken();

  const { data, error } = await supabase
    .from("quotes")
    .update({ share_token: newToken })
    .eq("id", id)
    .eq("company_id", company.company_id)
    .select("share_token")
    .maybeSingle();

  if (error) {
    logServerError("quotes.revoke-token", error);
    return { ok: false, error: clientErrorFor(error) };
  }
  if (!data) return { ok: false, error: "Orçamento não encontrado." };

  const token = (data as { share_token: string }).share_token;
  revalidatePath(`/app/orcamentos/${id}`);
  return {
    ok: true,
    share_token: token,
    url: publicQuoteUrl(token),
  };
}

export type MarkQuoteWhatsappSentResult =
  | { ok: true; sent_at: string }
  | { ok: false; error: string };

export async function markQuoteWhatsappSentAction(
  id: string,
): Promise<MarkQuoteWhatsappSentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const sentAt = new Date().toISOString();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .update({ whatsapp_sent_at: sentAt })
    .eq("id", id)
    .eq("company_id", company.company_id)
    .select("id")
    .maybeSingle();

  if (error) {
    logServerError("quotes.whatsapp-sent", error);
    if (isMissingWhatsappSentColumn(error)) {
      return {
        ok: false,
        error:
          "WhatsApp aberto. Para salvar o histórico de envio, aplique a migration 20260612000001_quote_whatsapp_sent_at.sql no Supabase.",
      };
    }
    return { ok: false, error: clientErrorFor(error) };
  }
  if (!data) return { ok: false, error: "Orçamento não encontrado." };

  revalidatePath("/app/orcamentos");
  revalidatePath(`/app/orcamentos/${id}`);
  return { ok: true, sent_at: sentAt };
}
