import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageCircle,
  Phone,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { formatBRL, formatDateBR } from "@/lib/utils";
import {
  formatPhone,
  formatQuantityBR,
  normalizeQuoteUnit,
  whatsappDirectShareLink,
} from "@/lib/format";
import { shouldShowPrumoBrand } from "@/lib/plans";
import type { EffectiveQuoteStatus } from "@/lib/quote-status";
import { ApprovalForm } from "./approval-form";

export interface PublicQuoteViewData {
  number: string;
  title: string;
  description: string | null;
  valid_until: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  total_cents: number;
  company: {
    name: string;
    phone: string | null;
    logo_url: string | null;
    city: string | null;
    state: string | null;
    pix_instructions: string | null;
    plan: string | null;
  };
  customer: {
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  items: Array<{
    position: number;
    description: string;
    unit: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
  }>;
  approvals: Array<{
    action: "approved" | "rejected";
    signer_name: string;
    rejection_reason: string | null;
    created_at: string;
  }>;
}

export function PublicQuoteView({
  quote,
  status,
  shareToken,
  nowMs,
}: {
  quote: PublicQuoteViewData;
  status: EffectiveQuoteStatus;
  shareToken: string;
  nowMs: number;
}) {
  const daysUntilExpiry = quote.valid_until
    ? Math.ceil(
        (new Date(quote.valid_until).getTime() - nowMs) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const lastApproval = quote.approvals[quote.approvals.length - 1];
  const isDecidable = status === "sent" || status === "viewed";
  const contactUrl = whatsappDirectShareLink({
    phone: quote.company.phone,
    message: `Olá, ${quote.company.name}. Estou vendo o orçamento ${quote.number} (${quote.title}) e quero tirar uma dúvida.`,
  });
  const companyPhoneLabel = contactUrl ? formatPhone(quote.company.phone) : null;
  const showPrumoBrand = shouldShowPrumoBrand(quote.company.plan);
  const customerLocation = quote.customer
    ? [quote.customer.city, quote.customer.state].filter(Boolean).join("/")
    : "";

  return (
    <main className="min-h-svh bg-background pb-24 text-foreground lg:pb-0">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {quote.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.company.logo_url}
                alt={quote.company.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {quote.company.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{quote.company.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {companyPhoneLabel && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone aria-hidden="true" className="h-3.5 w-3.5" />
                    {companyPhoneLabel}
                  </span>
                )}
                {(quote.company.city || quote.company.state) && (
                  <span className="inline-flex items-center gap-1.5 before:mr-3 before:text-border before:content-['·']">
                    {[quote.company.city, quote.company.state]
                      .filter(Boolean)
                      .join("/")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {contactUrl && (
            <Button
              asChild
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            >
              <TrackedAnchor
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                analyticsEvent="quote_contact_whatsapp_clicked"
                analyticsProperties={{ source: "public_header" }}
              >
                <MessageCircle aria-hidden="true" />
                Dúvida no WhatsApp
              </TrackedAnchor>
            </Button>
          )}
        </header>

        <section className="mt-4 rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem] md:items-end">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                Orçamento {quote.number}
              </div>
              <h1 className="mt-3 break-words text-balance text-2xl font-bold leading-tight sm:text-3xl">
                {quote.title}
              </h1>
              {quote.customer && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <span>Para </span>
                  <span className="font-semibold text-foreground">
                    {quote.customer.name}
                  </span>
                  {customerLocation ? <span> · {customerLocation}</span> : null}
                </div>
              )}
              {quote.description && (
                <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {quote.description}
                </p>
              )}
            </div>

            <div className="border-t pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <div className="text-xs font-semibold text-muted-foreground">
                Total da proposta
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-primary sm:text-3xl">
                {formatBRL(quote.total_cents / 100)}
              </div>
              {quote.valid_until && (
                <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Válido até{" "}
                    <strong className="text-foreground">
                      {formatDateBR(quote.valid_until)}
                    </strong>
                    {isDecidable &&
                      daysUntilExpiry != null &&
                      daysUntilExpiry > 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          {daysUntilExpiry === 1
                            ? "(falta 1 dia)"
                            : `(faltam ${daysUntilExpiry} dias)`}
                        </span>
                    )}
                  </span>
                </div>
              )}

            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:order-2">
            {isDecidable && (
              <ApprovalForm
                token={shareToken}
                companyName={quote.company.name}
                contactUrl={contactUrl}
              />
            )}

            <section className="rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Link único e privado</div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Só quem recebeu este link consegue ver, aprovar ou pedir
                    ajuste neste orçamento.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {status !== "expired" && (
                  <Button asChild variant="outline" className="w-full">
                    <TrackedAnchor
                      href={`/q/${shareToken}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      analyticsEvent="quote_pdf_clicked"
                      analyticsProperties={{ source: "public_quote" }}
                    >
                      <Download aria-hidden="true" />
                      Baixar PDF
                    </TrackedAnchor>
                  </Button>
                )}
                {contactUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  >
                    <TrackedAnchor
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      analyticsEvent="quote_contact_whatsapp_clicked"
                      analyticsProperties={{ source: "public_security_card" }}
                    >
                      <MessageCircle aria-hidden="true" />
                      Tirar dúvida no WhatsApp
                    </TrackedAnchor>
                  </Button>
                )}
              </div>
            </section>
          </aside>

          <div className="space-y-4 lg:order-1">
            {status === "approved" && quote.approved_at && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-950">Orçamento aprovado</div>
                    <div className="mt-1 text-sm text-emerald-800">
                      {lastApproval?.signer_name && (
                        <>
                          Aprovado por{" "}
                          <strong className="text-emerald-900">{lastApproval.signer_name}</strong> em{" "}
                        </>
                      )}
                      {formatDateBR(quote.approved_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === "rejected" && quote.rejected_at && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                    <XCircle aria-hidden="true" className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-amber-950">
                      Pedido de mudanças enviado
                    </div>
                    <div className="mt-1 text-sm text-amber-800">
                      {lastApproval?.signer_name && (
                        <>
                          Resposta de{" "}
                          <strong className="text-amber-900">{lastApproval.signer_name}</strong>
                          {" · "}
                        </>
                      )}
                      {formatDateBR(quote.rejected_at)}
                    </div>
                    {lastApproval?.rejection_reason && (
                      <div className="mt-3 border-l-2 border-amber-300 pl-3">
                        <div className="text-xs font-semibold text-amber-800">
                          O que foi solicitado
                        </div>
                        <div className="mt-1 text-sm text-amber-950">
                          {lastApproval.rejection_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {status === "expired" && (
              <div className="rounded-lg border bg-muted p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-200 text-slate-700">
                    <Clock aria-hidden="true" className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Este orçamento expirou</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Validade era{" "}
                      {quote.valid_until && formatDateBR(quote.valid_until)}.
                      Peça um novo ao {quote.company.name}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="overflow-hidden rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="mb-3 text-xs font-semibold text-muted-foreground">
                Itens incluídos
              </div>
              <ul className="divide-y divide-slate-100">
                {quote.items.map((item) => (
                  <li
                    key={`${item.position}-${item.description}`}
                    className="flex items-start gap-3 py-3 sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm font-semibold leading-5 text-foreground">
                        {item.description}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {`${formatQuantityBR(item.quantity)} ${normalizeQuoteUnit(item.unit)} × ${formatBRL(item.unit_price_cents / 100)}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                      {formatBRL(item.total_cents / 100)}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-1 flex items-center justify-between border-t pt-4">
                <span className="text-sm font-semibold text-muted-foreground">Total</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {formatBRL(quote.total_cents / 100)}
                </span>
              </div>
            </section>

            {quote.notes && (
              <section className="rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  Observações
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {quote.notes}
                </p>
              </section>
            )}

            {showPrumoBrand ? (
              <footer className="pb-8 pt-4 text-center text-xs text-muted-foreground">
                <a
                  href="https://gestaoempreita.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Tecnologia </span>
                  <span className="font-semibold text-foreground">
                    Prumo
                  </span>
                </a>
              </footer>
            ) : null}
          </div>
        </div>
      </div>

      {isDecidable && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold text-muted-foreground">
                Total da proposta
              </div>
              <div className="truncate text-lg font-bold tabular-nums text-primary">
                {formatBRL(quote.total_cents / 100)}
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 px-3"
            >
              <TrackedAnchor
                href="#decisao"
                analyticsEvent="quote_revision_started"
                analyticsProperties={{ source: "public_mobile_bar" }}
              >
                Ajustar
              </TrackedAnchor>
            </Button>
            <Button
              asChild
              className="shrink-0 px-4"
            >
              <TrackedAnchor
                href="#decisao"
                analyticsEvent="quote_approval_started"
                analyticsProperties={{ source: "public_mobile_bar" }}
              >
                Aprovar
              </TrackedAnchor>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
