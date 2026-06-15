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
  whatsappShareLink,
} from "@/lib/format";
import type { EffectiveQuoteStatus } from "@/lib/quote-status";
import { ApprovalForm } from "./approval-form";

interface PublicQuoteData {
  id: string;
  number: string;
  title: string;
  description: string | null;
  share_token: string;
  valid_until: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  total_cents: number;
  company: {
    name: string;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    city: string | null;
    state: string | null;
  };
  customer: {
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  items: Array<{
    id: string;
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
  nowMs,
}: {
  quote: PublicQuoteData;
  status: EffectiveQuoteStatus;
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
  const contactUrl = quote.company.phone
    ? whatsappShareLink({
        phone: quote.company.phone,
        message: `Olá, ${quote.company.name}. Estou vendo o orçamento ${quote.number} (${quote.title}) e quero tirar uma dúvida.`,
      })
    : null;

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-24 text-[#121826] lg:pb-0">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:py-8">
        <header className="flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {quote.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.company.logo_url}
                alt={quote.company.name}
                className="h-12 w-12 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#db5b18] text-lg font-bold text-white">
                {quote.company.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{quote.company.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#475569]">
                {quote.company.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatPhone(quote.company.phone)}
                  </span>
                )}
                {(quote.company.city || quote.company.state) && (
                  <span>
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
              className="h-11 border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
            >
              <TrackedAnchor
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                analyticsEvent="quote_contact_whatsapp_clicked"
                analyticsProperties={{ source: "public_header" }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </TrackedAnchor>
            </Button>
          )}
        </header>

        <section className="mt-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-md border border-[#e2e8f0] bg-[#fff7ed] px-3 py-1.5 text-xs font-semibold text-[#9a3412]">
                <FileText className="h-4 w-4" />
                Orçamento {quote.number}
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-normal sm:text-4xl">
                {quote.title}
              </h1>
              {quote.customer && (
                <div className="mt-3 text-sm text-[#475569]">
                  Para{" "}
                  <span className="font-semibold text-[#121826]">
                    {quote.customer.name}
                  </span>
                  {(quote.customer.city || quote.customer.state) && (
                    <>
                      {" · "}
                      {[quote.customer.city, quote.customer.state]
                        .filter(Boolean)
                        .join("/")}
                    </>
                  )}
                </div>
              )}
              {quote.description && (
                <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-[#475569]">
                  {quote.description}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                Total da proposta
              </div>
              <div className="mt-2 text-3xl font-black text-[#db5b18]">
                {formatBRL(quote.total_cents / 100)}
              </div>
              {quote.valid_until && (
                <div className="mt-3 flex items-start gap-2 text-sm text-[#475569]">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Válido até{" "}
                    <strong className="text-[#121826]">
                      {formatDateBR(quote.valid_until)}
                    </strong>
                    {isDecidable &&
                      daysUntilExpiry != null &&
                      daysUntilExpiry > 0 && (
                        <>
                          {" "}
                          {daysUntilExpiry === 1
                            ? "(falta 1 dia)"
                            : `(faltam ${daysUntilExpiry} dias)`}
                        </>
                    )}
                  </span>
                </div>
              )}

            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <aside className="space-y-3 lg:sticky lg:top-4 lg:order-2">
            {isDecidable && (
              <ApprovalForm
                token={quote.share_token}
                companyName={quote.company.name}
                contactUrl={contactUrl}
              />
            )}

            <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2f8f4e]" />
                <div>
                  <div className="font-semibold">Link único e privado</div>
                  <p className="mt-1 text-sm leading-6 text-[#475569]">
                    Só quem recebeu este link consegue ver, aprovar ou pedir
                    ajuste neste orçamento.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {status !== "expired" && (
                  <Button asChild variant="outline" className="h-11 w-full">
                    <TrackedAnchor
                      href={`/q/${quote.share_token}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      analyticsEvent="quote_pdf_clicked"
                      analyticsProperties={{ source: "public_quote" }}
                    >
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </TrackedAnchor>
                  </Button>
                )}
                {contactUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 w-full border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
                  >
                    <TrackedAnchor
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      analyticsEvent="quote_contact_whatsapp_clicked"
                      analyticsProperties={{ source: "public_security_card" }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Tirar dúvida no WhatsApp
                    </TrackedAnchor>
                  </Button>
                )}
              </div>
            </section>
          </aside>

          <div className="space-y-3 lg:order-1">
            {status === "approved" && quote.approved_at && (
              <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-semibold">Orçamento aprovado</div>
                    <div className="text-sm">
                      {lastApproval?.signer_name && (
                        <>
                          Aprovado por{" "}
                          <strong>{lastApproval.signer_name}</strong> em{" "}
                        </>
                      )}
                      {formatDateBR(quote.approved_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === "rejected" && quote.rejected_at && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-semibold">
                      Pedido de mudanças enviado
                    </div>
                    <div className="text-sm text-amber-900/80">
                      {lastApproval?.signer_name && (
                        <>
                          Resposta de{" "}
                          <strong>{lastApproval.signer_name}</strong>
                          {" · "}
                        </>
                      )}
                      {formatDateBR(quote.rejected_at)}
                    </div>
                    {lastApproval?.rejection_reason && (
                      <div className="mt-3 rounded-md bg-white/75 p-3 text-sm">
                        <div className="text-xs font-semibold text-amber-900/70">
                          O que foi solicitado
                        </div>
                        <div className="mt-1">
                          {lastApproval.rejection_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {status === "expired" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-semibold">Esse orçamento expirou</div>
                    <div className="text-sm text-amber-900/80">
                      Validade era{" "}
                      {quote.valid_until && formatDateBR(quote.valid_until)}.
                      Peça um novo ao {quote.company.name}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Itens incluídos
              </div>
              <ul className="mt-2 divide-y divide-[#e2e8f0]">
                {quote.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 py-3 sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-tight">
                        {item.description}
                      </div>
                      <div className="mt-1 text-xs text-[#475569]">
                        {formatQuantityBR(item.quantity)}{" "}
                        {normalizeQuoteUnit(item.unit)} ×{" "}
                        {formatBRL(item.unit_price_cents / 100)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-bold">
                      {formatBRL(item.total_cents / 100)}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-[#e2e8f0] pt-4">
                <span className="text-sm font-medium text-[#475569]">Total</span>
                <span className="text-2xl font-black text-[#db5b18]">
                  {formatBRL(quote.total_cents / 100)}
                </span>
              </div>
            </section>

            {quote.notes && (
              <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                  Observações
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {quote.notes}
                </p>
              </section>
            )}

            <footer className="pb-6 pt-2 text-center text-xs text-[#475569]">
              Gerado por{" "}
              <span className="font-semibold text-[#121826]">
                Gestão Empreita
              </span>
            </footer>
          </div>
        </div>
      </div>

      {isDecidable && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2e8f0] bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                Total da proposta
              </div>
              <div className="truncate text-lg font-black text-[#db5b18]">
                {formatBRL(quote.total_cents / 100)}
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-11 shrink-0 border-[#e2e8f0] px-3"
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
              className="h-11 shrink-0 bg-green-600 px-4 font-bold text-white hover:bg-green-700"
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
