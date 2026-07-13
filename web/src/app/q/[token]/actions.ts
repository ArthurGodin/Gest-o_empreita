"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientErrorFor, logServerError, logServerEvent } from "@/lib/log";
import { tokensMatch } from "@/lib/quote-token";
import { effectiveStatus } from "@/lib/quote-status";
import { notifyCompanyOwner } from "@/lib/email/send";
import {
  buildQuoteApprovedEmail,
  buildQuoteRejectedEmail,
} from "@/lib/email/templates";
import { env } from "@/lib/env";
import { generatePreferredPixForCharge } from "@/lib/billing/provider";

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
  reason: z
    .string()
    .trim()
    .min(5, "Descreva rapidamente o que precisa mudar.")
    .max(1000, "Motivo muito longo (máx. 1000 caracteres)"),
});

const deliverySchema = z.object({
  token: tokenSchema,
  signer_name: z.string().trim().min(2, "Digite seu nome (mínimo 2 letras)"),
});

export type PublicActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type PublicDeliveryActionResult =
  | { ok: true }
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
      id, company_id, project_id, customer_id, status, share_token, valid_until, sent_at,
      title, total_cents, notification_sent_at,
      number,
      customer:customers(id, name, document, phone, email)
      `,
    )
    .eq("share_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as {
    id: string;
    company_id: string;
    project_id: string | null;
    customer_id: string | null;
    status: "draft" | "sent" | "viewed" | "approved" | "rejected" | "expired";
    share_token: string;
    valid_until: string | null;
    sent_at: string | null;
    title: string;
    number: string;
    total_cents: number;
    notification_sent_at: string | null;
    customer: {
      id: string;
      name: string;
      document: string | null;
      phone: string | null;
      email: string | null;
    } | null;
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

  logServerEvent("public.quote.approved", {
    company_id: quote.company_id,
    quote_id: quote.id,
    total_cents: quote.total_cents,
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

  logServerEvent("public.quote.rejected", {
    company_id: quote.company_id,
    quote_id: quote.id,
    total_cents: quote.total_cents,
  });

  return { ok: true, redirectTo: `/q/${parsed.data.token}` };
}

// --- Delivery approval ------------------------------------------------------

export async function approveDeliveryAction(input: {
  token: string;
  signer_name: string;
}): Promise<PublicDeliveryActionResult> {
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const quote = await loadQuoteByToken(parsed.data.token);
  if (!quote || !quote.project_id) {
    return { ok: false, error: "Link inválido ou obra não encontrada." };
  }
  if (!tokensMatch(quote.share_token, parsed.data.token)) {
    return { ok: false, error: "Link inválido." };
  }
  if (!quote.customer) {
    return { ok: false, error: "Cliente não encontrado." };
  }

  const admin = createAdminClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, company_id, status, delivery_approved_at")
    .eq("id", quote.project_id)
    .eq("company_id", quote.company_id)
    .maybeSingle();

  if (projectError) {
    logServerError("public.delivery.fetch-project", projectError);
    return { ok: false, error: clientErrorFor(projectError) };
  }
  if (!project) return { ok: false, error: "Obra não encontrada." };
  if (project.status !== "completed") {
    return {
      ok: false,
      error: "A entrega só pode ser confirmada quando a obra estiver concluída.",
    };
  }

  const approvedAt = project.delivery_approved_at ?? new Date().toISOString();
  if (!project.delivery_approved_at) {
    const { error: approveError } = await admin
      .from("projects")
      .update({
        delivery_approved_at: approvedAt,
        delivery_approved_token: parsed.data.token,
      })
      .eq("id", quote.project_id)
      .eq("company_id", quote.company_id)
      .is("delivery_approved_at", null);

    if (approveError) {
      logServerError("public.delivery.approve", approveError);
      return { ok: false, error: clientErrorFor(approveError) };
    }
  }

  const { data: saldoCharge, error: chargeError } = await admin
    .from("billing_charges")
    .select("id, status, released_at")
    .eq("project_id", quote.project_id)
    .eq("company_id", quote.company_id)
    .eq("kind", "saldo")
    .maybeSingle();

  if (chargeError) {
    logServerError("public.delivery.fetch-saldo", chargeError);
    return { ok: false, error: clientErrorFor(chargeError) };
  }
  if (!saldoCharge) {
    revalidateDeliveryPaths(parsed.data.token, quote.project_id);
    return { ok: true };
  }

  if (!saldoCharge.released_at) {
    const { error: releaseError } = await admin
      .from("billing_charges")
      .update({
        released_at: approvedAt,
        released_by_token: parsed.data.token,
      })
      .eq("id", saldoCharge.id)
      .eq("company_id", quote.company_id);

    if (releaseError) {
      logServerError("public.delivery.release-saldo", releaseError);
      return { ok: false, error: clientErrorFor(releaseError) };
    }
  }

  if (saldoCharge.status === "draft") {
    try {
      const result = await generatePreferredPixForCharge(admin, {
        chargeId: saldoCharge.id,
        companyId: quote.company_id,
        customer: quote.customer,
        description: `Saldo - ${quote.title}`,
      });
      if (result.warning) return { ok: false, error: result.warning };
    } catch (billingError) {
      logServerError("public.delivery.generate-saldo-pix", billingError);
      return { ok: false, error: clientErrorFor(billingError) };
    }
  }

  revalidateDeliveryPaths(parsed.data.token, quote.project_id);
  logServerEvent("public.delivery.approved", {
    company_id: quote.company_id,
    quote_id: quote.id,
    project_id: quote.project_id,
    generated_saldo_pix: saldoCharge.status === "draft",
  });
  return { ok: true };
}

function revalidateDeliveryPaths(token: string, projectId: string) {
  revalidatePath(`/q/${token}`);
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath("/app/financeiro");
}
