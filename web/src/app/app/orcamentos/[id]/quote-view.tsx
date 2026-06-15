import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { formatPhone, formatQuantityBR, normalizeQuoteUnit } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/quote-status";
import type {
  QuoteRevisionSummary,
  QuoteWithRelations,
} from "@/lib/queries/quotes";
import type { PaymentProvider } from "@/lib/supabase/types";
import { ShareLinkCard } from "./share-link-card";
import { ConvertToProject, type TemplateOption } from "./convert-to-project";
import { DuplicateButton } from "./duplicate-button";

/**
 * Modo read-only do orçamento (quando status != draft).
 * Mostra cliente, validade, itens, total, observações e status atual.
 * Empreiteiro precisa duplicar pra editar.
 */
export function QuoteView({
  quote,
  revisions,
  templates,
  paymentProvider,
}: {
  quote: QuoteWithRelations;
  revisions: QuoteRevisionSummary[];
  templates: TemplateOption[];
  paymentProvider: PaymentProvider;
}) {
  const total = quote.total_cents;
  const lastApproval = quote.approvals[quote.approvals.length - 1];
  const latestRevision = revisions[0] ?? null;
  const messageMode = quote.revision_source_id ? "revision" : "quote";

  return (
    <div className="space-y-6">
      {/* ── Banner de aprovação/rejeição (quando aplicável) ─────── */}
      {quote.effective_status === "approved" && lastApproval && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-400" />
              <div className="text-sm">
                <div className="font-semibold text-green-900 dark:text-green-100">
                  Aprovado por {lastApproval.signer_name}
                </div>
                <div className="text-green-800/80 dark:text-green-200/80">
                  {formatDateBR(lastApproval.created_at)}
                  {!quote.project_id && " · Próximo passo: clique em \"Virar obra\" pra começar."}
                  {quote.project_id && " · Obra já criada."}
                </div>
              </div>
            </div>
            {!quote.project_id && (
              <ConvertToProject
                quoteId={quote.id}
                quoteTitle={quote.title}
                quoteTotalCents={quote.total_cents}
                customerDocument={quote.customer?.document}
                templates={templates}
                paymentProvider={paymentProvider}
              />
            )}
          </div>
        </div>
      )}

      {quote.effective_status === "rejected" && lastApproval && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div className="text-sm">
                <div className="font-semibold">
                  {lastApproval.signer_name} pediu mudanças
                </div>
                <div className="text-amber-900/70">
                  {formatDateBR(lastApproval.created_at)}
                </div>
                {lastApproval.rejection_reason && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-white/75 p-3">
                    <div className="text-xs font-medium text-amber-900/70">
                      Motivo
                    </div>
                    <div className="mt-1">{lastApproval.rejection_reason}</div>
                  </div>
                )}
                {latestRevision ? (
                  <p className="mt-3 text-amber-900/80">
                    Já existe uma revisão ligada a esta recusa. Continue nela para
                    manter a negociação organizada e evitar versões soltas.
                  </p>
                ) : (
                  <p className="mt-3 text-amber-900/80">
                    Crie uma revisão editável, ajuste o que foi pedido e envie um
                    novo link para o cliente sem apagar este histórico.
                  </p>
                )}
              </div>
            </div>
            {latestRevision ? (
              <div className="min-w-0 rounded-lg border border-amber-200 bg-white/75 p-3 text-sm sm:w-72">
                <div className="text-xs font-semibold uppercase text-amber-900/70">
                  Revisão mais recente
                </div>
                <div className="mt-1 truncate font-semibold">
                  {latestRevision.number} · {latestRevision.title}
                </div>
                <div className="mt-1 text-amber-900/70">
                  {STATUS_LABEL[latestRevision.effective_status]} ·{" "}
                  {formatDateBR(latestRevision.created_at)}
                </div>
                <Button
                  asChild
                  size="sm"
                  className="mt-3 w-full bg-amber-600 text-white hover:bg-amber-700"
                >
                  <Link href={`/app/orcamentos/${latestRevision.id}`}>
                    Abrir revisão
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <DuplicateButton
                id={quote.id}
                intent="revision"
                label="Ajustar e reenviar"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Status banner ──────────────────────────────────────── */}
      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
        Status atual:{" "}
        <span className="font-semibold text-foreground">
          {STATUS_LABEL[quote.effective_status]}
        </span>
        {quote.sent_at && (
          <span className="ml-2 text-muted-foreground">
            · Enviado em {formatDateBR(quote.sent_at)}
          </span>
        )}
        {quote.viewed_at && (
          <span className="ml-2 text-muted-foreground">
            · Visto em {formatDateBR(quote.viewed_at)}
          </span>
        )}
      </div>

      {/* ── Link público (compartilhar) ────────────────────────── */}
      {quote.share_token && (
        <ShareLinkCard
          quoteId={quote.id}
          shareToken={quote.share_token}
          quoteNumber={quote.number}
          quoteTitle={quote.title}
          quoteTotalCents={quote.total_cents}
          customerName={quote.customer?.name}
          customerPhone={quote.customer?.phone}
          whatsappSentAt={quote.whatsapp_sent_at}
          messageMode={messageMode}
        />
      )}

      {/* ── Download PDF ────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
            Baixar PDF
          </a>
        </Button>
      </div>

      {/* ── Cliente + validade ──────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Cliente
        </h2>
        {quote.customer ? (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 font-medium text-base">
              <User className="h-4 w-4 text-muted-foreground" />
              {quote.customer.name}
            </div>
            {quote.customer.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {formatPhone(quote.customer.phone)}
              </div>
            )}
            {quote.customer.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {quote.customer.email}
              </div>
            )}
            {(quote.customer.city || quote.customer.state) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[quote.customer.city, quote.customer.state]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Cliente removido</div>
        )}
        {quote.valid_until && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Válido até {formatDateBR(quote.valid_until)}
          </div>
        )}
      </section>

      {/* ── Itens ───────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Itens ({quote.items.length})
        </h2>
        <ul className="divide-y">
          {quote.items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex-1">
                <div className="font-medium">{item.description}</div>
                <div className="text-sm text-muted-foreground">
                  {formatQuantityBR(item.quantity)} {normalizeQuoteUnit(item.unit)} ×{" "}
                  {formatBRL(item.unit_price_cents / 100)}
                </div>
              </div>
              <div className="font-semibold">
                {formatBRL(item.total_cents / 100)}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatBRL(total / 100)}
          </span>
        </div>
      </section>

      {/* ── Observações ─────────────────────────────────────────── */}
      {quote.notes && (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Observações
          </h2>
          <p className="whitespace-pre-wrap text-sm">{quote.notes}</p>
        </section>
      )}
    </div>
  );
}
