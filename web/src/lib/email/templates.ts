import "server-only";
import { formatBRL, formatDateBR } from "@/lib/utils";

/**
 * Templates de email em HTML puro (inline styles — única forma confiável
 * em clientes de email como Gmail/Outlook).
 *
 * Funções retornam { subject, html, text }. Text é fallback pra clientes
 * que não renderizam HTML.
 *
 * SR-#6 (CRLF injection): subject lines passam por `safeSubject` que
 * strips \r e \n, truncando em 200 chars — defense-in-depth contra header
 * injection caso algum SMTP intermediário não saneie.
 */

function safeSubject(s: string): string {
  return s.replace(/[\r\n\t]/g, " ").trim().slice(0, 200);
}

interface QuoteContext {
  quoteNumber: string;
  quoteTitle: string;
  totalCents: number;
  customerName: string;
  signerName: string;
  signedAt: Date;
  rejectionReason?: string | null;
  /** URL pra abrir o orçamento no app do empreiteiro */
  detailUrl: string;
}

export function buildQuoteApprovedEmail(ctx: QuoteContext) {
  const subject = safeSubject(
    `✓ ${ctx.customerName} aprovou o orçamento ${ctx.quoteNumber}`,
  );

  const text = [
    `Boa notícia!`,
    ``,
    `${ctx.signerName} aprovou o orçamento ${ctx.quoteNumber} ("${ctx.quoteTitle}") em ${formatDateBR(ctx.signedAt.toISOString())}.`,
    ``,
    `Total: ${formatBRL(ctx.totalCents / 100)}`,
    `Cliente: ${ctx.customerName}`,
    ``,
    `Próximo passo: abra o orçamento e clique em "Virar obra" pra começar.`,
    ``,
    `${ctx.detailUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
      <div style="background: #f97316; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <div style="font-size: 36px; line-height: 1; margin-bottom: 8px;">✓</div>
        <h1 style="font-size: 20px; font-weight: 600; margin: 0;">Orçamento aprovado!</h1>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px;">
          <strong>${escapeHtml(ctx.signerName)}</strong> acabou de aprovar o orçamento
          <span style="font-family: monospace;">${escapeHtml(ctx.quoteNumber)}</span>.
        </p>

        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Orçamento</div>
          <div style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(ctx.quoteTitle)}</div>

          <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Cliente</div>
          <div style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(ctx.customerName)}</div>

          <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Total</div>
          <div style="font-size: 24px; font-weight: 700; color: #f97316;">${formatBRL(ctx.totalCents / 100)}</div>
        </div>

        <p style="margin: 16px 0;">
          Próximo passo: abra o orçamento no painel e clique em <strong>Virar obra</strong> pra começar.
        </p>

        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${ctx.detailUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Abrir orçamento
          </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0; text-align: center;">
          Aprovado em ${formatDateBR(ctx.signedAt.toISOString())} · Prumo
        </p>
      </div>
    </div>
  `;

  return { subject, html, text };
}

export function buildQuoteRejectedEmail(ctx: QuoteContext) {
  const subject = safeSubject(
    `${ctx.customerName} pediu mudanças no orçamento ${ctx.quoteNumber}`,
  );

  const reasonBlock = ctx.rejectionReason?.trim()
    ? `Motivo informado: "${ctx.rejectionReason}"\n\n`
    : "";

  const text = [
    `${ctx.signerName} pediu mudanças no orçamento ${ctx.quoteNumber} ("${ctx.quoteTitle}") em ${formatDateBR(ctx.signedAt.toISOString())}.`,
    ``,
    reasonBlock,
    `Próximo passo: abra o orçamento, clique em "Ajustar e reenviar", ajuste o que precisar e mande de novo.`,
    ``,
    `${ctx.detailUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
      <div style="background: #6b7280; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0;">${escapeHtml(ctx.signerName)} pediu mudanças</h1>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px;">
          O orçamento <span style="font-family: monospace;">${escapeHtml(ctx.quoteNumber)}</span> não foi aprovado dessa vez.
        </p>

        ${
          ctx.rejectionReason?.trim()
            ? `<div style="background: #fef9c3; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 3px solid #ca8a04;">
                <div style="font-size: 13px; color: #854d0e; margin-bottom: 4px;">Motivo</div>
                <div style="color: #422006;">${escapeHtml(ctx.rejectionReason)}</div>
              </div>`
            : ""
        }

        <p style="margin: 16px 0;">
          Clique em <strong>Ajustar e reenviar</strong>, ajuste o orçamento sem perder o original e mande de novo.
        </p>

        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${ctx.detailUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Abrir orçamento
          </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0; text-align: center;">
          Resposta recebida em ${formatDateBR(ctx.signedAt.toISOString())} · Prumo
        </p>
      </div>
    </div>
  `;

  return { subject, html, text };
}

export interface QuoteViewedContext {
  quoteNumber: string;
  quoteTitle: string;
  totalCents: number;
  customerName: string;
  viewedAt: Date;
  detailUrl: string;
}

export function buildQuoteViewedEmail(ctx: QuoteViewedContext) {
  const subject = safeSubject(
    `👀 O cliente está vendo o orçamento ${ctx.quoteNumber} agora!`,
  );

  const text = [
    `Cliente na página!`,
    ``,
    `${ctx.customerName} acabou de abrir o orçamento ${ctx.quoteNumber} ("${ctx.quoteTitle}") em ${formatDateBR(ctx.viewedAt.toISOString())}.`,
    ``,
    `Total: ${formatBRL(ctx.totalCents / 100)}`,
    ``,
    `Se o cliente tiver dúvidas, este é um ótimo momento para estar disponível no WhatsApp.`,
    ``,
    `${ctx.detailUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.5;">
      <div style="background: #3b82f6; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <div style="font-size: 36px; line-height: 1; margin-bottom: 8px;">👀</div>
        <h1 style="font-size: 20px; font-weight: 600; margin: 0;">Cliente na página!</h1>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px;">
          <strong>${escapeHtml(ctx.customerName)}</strong> acabou de abrir o orçamento
          <span style="font-family: monospace;">${escapeHtml(ctx.quoteNumber)}</span> e está visualizando a proposta neste momento.
        </p>

        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Orçamento</div>
          <div style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(ctx.quoteTitle)}</div>

          <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Total</div>
          <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${formatBRL(ctx.totalCents / 100)}</div>
        </div>

        <p style="margin: 16px 0;">
          Se o cliente tiver dúvidas, este é um <strong>ótimo momento</strong> para estar disponível no WhatsApp e fechar negócio!
        </p>

        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${ctx.detailUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Abrir orçamento
          </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin: 24px 0 0; text-align: center;">
          Visualizado em ${formatDateBR(ctx.viewedAt.toISOString())} · Prumo
        </p>
      </div>
    </div>
  `;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
