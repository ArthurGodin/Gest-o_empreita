"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientErrorFor, logServerError } from "@/lib/log";
import { tokensMatch } from "@/lib/quote-token";
import { effectiveStatus } from "@/lib/quote-status";
import { notifyCompanyOwner } from "@/lib/email/send";
import {
  buildQuoteApprovedEmail,
  buildQuoteRejectedEmail,
} from "@/lib/email/templates";
import { env } from "@/lib/env";

/**
 * Server actions chamadas pelo link público /q/[token]. Não passam pelo auth
 * normal — autenticação É o conhecimento do token. Sempre usam admin client
 * (service role) com validação manual do token.
 */

const tokenSchema = z.string().min(32, "Token inválido");

const approveSchema = z.object({
  token: tokenSchema,
  signer_name: z.string().trim().min(2, "Digite seu nome (mínimo 2 letras)"),
});

const rejectSchema = z.object({
  token: tokenSchema,
  signer_name: z.string().trim().min(2, "Digite seu nome (mínimo 2 letras)"),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type PublicActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Helpers internos ──────────────────────────────────────────────────────

async function clientMeta() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent") ?? null;
  return { ip, userAgent };
}

async function loadQuoteByToken(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quotes")
    .select(
      `
      id, company_id, status, share_token, valid_until, sent_at,
      title, total_cents, notification_sent_at,
      number,
      customer:customers(name)
      `,
    )
    .eq("share_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as {
    id: string;
    company_id: string;
    status: "draft" | "sent" | "viewed" | "approved" | "rejected" | "expired";
    share_token: string;
    valid_until: string | null;
    sent_at: string | null;
    title: string;
    number: string;
    total_cents: number;
    notification_sent_at: string | null;
    customer: { name: string } | null;
  };
}

// ─── Approve ───────────────────────────────────────────────────────────────

export async function approveQuoteAction(input: {
  token: string;
  signer_name: string;
}): Promise<PublicActionResult> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const quote = await loadQuoteByToken(parsed.data.token);
  if (!quote) return { ok: false, error: "Link inválido ou expirado." };

  // Defesa em profundidade — comparação constant-time
  if (!tokensMatch(quote.share_token, parsed.data.token)) {
    return { ok: false, error: "Link inválido." };
  }

  const effective = effectiveStatus({
    status: quote.status,
    valid_until: quote.valid_until,
  });

  // Idempotente: já aprovado → redirect direto pra /aprovado
  if (effective === "approved") {
    return { ok: true, redirectTo: `/q/${parsed.data.token}/aprovado` };
  }
  // Já recusado / expirado → não permite mudar
  if (effective === "rejected") {
    return { ok: false, error: "Esse orçamento já foi marcado como recusado." };
  }
  if (effective === "expired") {
    return {
      ok: false,
      error: "Esse orçamento expirou. Peça um novo ao empreiteiro.",
    };
  }
  if (effective !== "sent" && effective !== "viewed") {
    return { ok: false, error: "Esse orçamento não está disponível pra aprovação." };
  }

  const admin = createAdminClient();
  const { ip, userAgent } = await clientMeta();
  const approvedAt = new Date();

  // Update quote com STATUS GUARD atômico — só faz a transição se status ainda
  // está em ('sent', 'viewed'). Evita race com reject simultâneo.
  const { data: updated, error: updateError } = await admin
    .from("quotes")
    .update({
      status: "approved",
      approved_at: approvedAt.toISOString(),
    })
    .eq("id", quote.id)
    .in("status", ["sent", "viewed"])
    .select("id")
    .maybeSingle();

  if (updateError) {
    logServerError("public.approve.update", updateError);
    return { ok: false, error: clientErrorFor(updateError) };
  }

  // 0 linhas afetadas: outra request mudou o status entre nosso check e a
  // update. Re-checa estado atual e retorna idempotente.
  if (!updated) {
    return { ok: true, redirectTo: `/q/${parsed.data.token}/aprovado` };
  }

  // Insert auditoria — unique(quote_id, action) impede duplicação por
  // double-click. Se já existe, ignora silenciosamente (idempotente).
  const { error: approvalError } = await admin.from("quote_approvals").insert({
    quote_id: quote.id,
    company_id: quote.company_id,
    action: "approved",
    signer_name: parsed.data.signer_name,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (approvalError) {
    const code = (approvalError as { code?: string }).code;
    if (code !== "23505") {
      // 23505 = unique violation → audit já existe, OK. Outros erros loga.
      logServerError("public.approve.insert-audit", approvalError);
    }
  }

  // Email — tenta enviar. Marca notification_sent_at *antes* da idempotência
  // ser checada se já estiver setado. Resiliente a falhas: se Resend falha,
  // fica null e a próxima tentativa de outro flow (futuro lembrete cron) re-envia.
  await trySendNotification(admin, {
    quote_id: quote.id,
    company_id: quote.company_id,
    already_sent_at: quote.notification_sent_at,
    builder: () =>
      buildQuoteApprovedEmail({
        quoteNumber: quote.number,
        quoteTitle: quote.title,
        totalCents: quote.total_cents,
        customerName: quote.customer?.name ?? "Cliente",
        signerName: parsed.data.signer_name,
        signedAt: approvedAt,
        detailUrl: `${env.NEXT_PUBLIC_APP_URL}/app/orcamentos/${quote.id}`,
      }),
  });

  return { ok: true, redirectTo: `/q/${parsed.data.token}/aprovado` };
}

// ─── Helper compartilhado pra envio de email idempotente ───────────────────
async function trySendNotification(
  admin: ReturnType<typeof createAdminClient>,
  ctx: {
    quote_id: string;
    company_id: string;
    already_sent_at: string | null;
    builder: () => { subject: string; html: string; text: string };
  },
) {
  if (ctx.already_sent_at) return; // já notificou antes
  const result = await notifyCompanyOwner(ctx.company_id, ctx.builder());
  if (result.sent) {
    await admin
      .from("quotes")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", ctx.quote_id);
  }
  // Se falhou: NÃO marca, pra permitir retry futuro (Wave 2 fix #9).
}

// ─── Reject ────────────────────────────────────────────────────────────────

export async function rejectQuoteAction(input: {
  token: string;
  signer_name: string;
  reason?: string;
}): Promise<PublicActionResult> {
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const quote = await loadQuoteByToken(parsed.data.token);
  if (!quote) return { ok: false, error: "Link inválido ou expirado." };

  if (!tokensMatch(quote.share_token, parsed.data.token)) {
    return { ok: false, error: "Link inválido." };
  }

  const effective = effectiveStatus({
    status: quote.status,
    valid_until: quote.valid_until,
  });

  if (effective === "rejected") {
    return { ok: true, redirectTo: `/q/${parsed.data.token}` };
  }
  if (effective === "approved") {
    return { ok: false, error: "Esse orçamento já foi aprovado." };
  }
  if (effective === "expired") {
    return {
      ok: false,
      error: "Esse orçamento expirou. Peça um novo ao empreiteiro.",
    };
  }
  if (effective !== "sent" && effective !== "viewed") {
    return { ok: false, error: "Esse orçamento não está disponível." };
  }

  const admin = createAdminClient();
  const { ip, userAgent } = await clientMeta();
  const rejectedAt = new Date();
  const reason = parsed.data.reason?.trim() || null;

  // Update guard-by-status — evita race com approve simultâneo
  const { data: updated, error: updateError } = await admin
    .from("quotes")
    .update({
      status: "rejected",
      rejected_at: rejectedAt.toISOString(),
    })
    .eq("id", quote.id)
    .in("status", ["sent", "viewed"])
    .select("id")
    .maybeSingle();

  if (updateError) {
    logServerError("public.reject.update", updateError);
    return { ok: false, error: clientErrorFor(updateError) };
  }

  // Outra request mudou o status no meio — provavelmente approve venceu
  if (!updated) {
    return { ok: true, redirectTo: `/q/${parsed.data.token}` };
  }

  const { error: approvalError } = await admin.from("quote_approvals").insert({
    quote_id: quote.id,
    company_id: quote.company_id,
    action: "rejected",
    signer_name: parsed.data.signer_name,
    rejection_reason: reason,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (approvalError) {
    const code = (approvalError as { code?: string }).code;
    if (code !== "23505") {
      logServerError("public.reject.insert-audit", approvalError);
    }
  }

  await trySendNotification(admin, {
    quote_id: quote.id,
    company_id: quote.company_id,
    already_sent_at: quote.notification_sent_at,
    builder: () =>
      buildQuoteRejectedEmail({
        quoteNumber: quote.number,
        quoteTitle: quote.title,
        totalCents: quote.total_cents,
        customerName: quote.customer?.name ?? "Cliente",
        signerName: parsed.data.signer_name,
        signedAt: rejectedAt,
        rejectionReason: reason,
        detailUrl: `${env.NEXT_PUBLIC_APP_URL}/app/orcamentos/${quote.id}`,
      }),
  });

  return { ok: true, redirectTo: `/q/${parsed.data.token}` };
}
