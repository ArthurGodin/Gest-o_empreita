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
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 lg:pb-0 relative overflow-hidden font-sans">
      {/* Background Glows e Pattern "SaaS Premium" */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grid pattern suave */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#059669]/10 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:py-8 relative z-10">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {quote.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.company.logo_url}
                alt={quote.company.name}
                className="h-14 w-14 rounded-xl object-cover shadow-sm border border-slate-100"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#059669] to-[#10b981] text-xl font-black text-white shadow-md shadow-[#059669]/20">
                {quote.company.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-lg font-bold tracking-tight text-slate-900">{quote.company.name}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                {companyPhoneLabel && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {companyPhoneLabel}
                  </span>
                )}
                {(quote.company.city || quote.company.state) && (
                  <span className="inline-flex items-center gap-1.5 before:content-['·'] before:mr-4 before:text-slate-300">
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
              className="h-11 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 shadow-sm transition-all"
            >
              <TrackedAnchor
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                analyticsEvent="quote_contact_whatsapp_clicked"
                analyticsProperties={{ source: "public_header" }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Dúvida no WhatsApp
              </TrackedAnchor>
            </Button>
          )}
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200/60 bg-white p-6 md:p-8 shadow-md">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-md border border-[#e2e8f0] bg-[#fff7ed] px-3 py-1.5 text-xs font-semibold text-[#064e3b]">
                <FileText className="h-4 w-4" />
                Orçamento {quote.number}
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-normal sm:text-4xl">
                {quote.title}
              </h1>
              {quote.customer && (
                <div className="mt-3 text-sm text-[#475569]">
                  <span>Para </span>
                  <span className="font-semibold text-[#121826]">
                    {quote.customer.name}
                  </span>
                  {customerLocation ? <span> · {customerLocation}</span> : null}
                </div>
              )}
              {quote.description && (
                <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-[#475569]">
                  {quote.description}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-6 md:p-8">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Total da proposta
              </div>
              <div className="mt-3 text-4xl font-black tracking-tight text-[#059669]">
                {formatBRL(quote.total_cents / 100)}
              </div>
              {quote.valid_until && (
                <div className="mt-4 flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    Válido até{" "}
                    <strong className="text-slate-900">
                      {formatDateBR(quote.valid_until)}
                    </strong>
                    {isDecidable &&
                      daysUntilExpiry != null &&
                      daysUntilExpiry > 0 && (
                        <span className="text-slate-400">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:order-2">
            {isDecidable && (
              <ApprovalForm
                token={shareToken}
                companyName={quote.company.name}
                contactUrl={contactUrl}
              />
            )}

            <section className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 tracking-tight">Link único e privado</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 font-medium">
                    Só quem recebeu este link consegue ver, aprovar ou pedir
                    ajuste neste orçamento.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {status !== "expired" && (
                  <Button asChild variant="outline" className="h-12 w-full rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold shadow-sm transition-all">
                    <TrackedAnchor
                      href={`/q/${shareToken}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      analyticsEvent="quote_pdf_clicked"
                      analyticsProperties={{ source: "public_quote" }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </TrackedAnchor>
                  </Button>
                )}
                {contactUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 w-full rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 shadow-sm transition-all"
                  >
                    <TrackedAnchor
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      analyticsEvent="quote_contact_whatsapp_clicked"
                      analyticsProperties={{ source: "public_security_card" }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Tirar dúvida no WhatsApp
                    </TrackedAnchor>
                  </Button>
                )}
              </div>
            </section>
          </aside>

          <div className="space-y-4 lg:order-1">
            {status === "approved" && quote.approved_at && (
              <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/50 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-900 tracking-tight text-lg">Orçamento aprovado!</div>
                    <div className="text-sm font-medium text-emerald-800/80 mt-1">
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
              <div className="rounded-2xl border-2 border-amber-500/20 bg-amber-50/50 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-amber-900 tracking-tight text-lg">
                      Pedido de mudanças enviado
                    </div>
                    <div className="text-sm font-medium text-amber-800/80 mt-1">
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
                      <div className="mt-4 rounded-xl border border-amber-200/60 bg-white/60 p-4 shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-900/60">
                          O que foi solicitado
                        </div>
                        <div className="mt-2 text-sm text-amber-950 font-medium">
                          {lastApproval.rejection_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {status === "expired" && (
              <div className="rounded-2xl border-2 border-slate-300/40 bg-slate-100/50 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 tracking-tight text-lg">Esse orçamento expirou</div>
                    <div className="text-sm font-medium text-slate-600 mt-1">
                      Validade era{" "}
                      {quote.valid_until && formatDateBR(quote.valid_until)}.
                      Peça um novo ao {quote.company.name}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
                Itens incluídos
              </div>
              <ul className="divide-y divide-slate-100">
                {quote.items.map((item) => (
                  <li
                    key={`${item.position}-${item.description}`}
                    className="flex items-start gap-4 py-4 sm:items-center group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 leading-tight group-hover:text-[#059669] transition-colors">
                        {item.description}
                      </div>
                      <div className="mt-1.5 text-sm font-medium text-slate-500">
                        {`${formatQuantityBR(item.quantity)} ${normalizeQuoteUnit(item.unit)} × ${formatBRL(item.unit_price_cents / 100)}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-base font-black text-slate-900">
                      {formatBRL(item.total_cents / 100)}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex items-center justify-between border-t-2 border-slate-100 pt-6">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Total</span>
                <span className="text-3xl font-black tracking-tight text-[#059669]">
                  {formatBRL(quote.total_cents / 100)}
                </span>
              </div>
            </section>

            {quote.notes && (
              <section className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Observações
                </div>
                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600">
                  {quote.notes}
                </p>
              </section>
            )}

            {showPrumoBrand ? (
              <footer className="pb-8 pt-4 text-center text-xs font-medium text-slate-400">
                <a
                  href="https://gestaoempreita.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors"
                >
                  <span>Tecnologia </span>
                  <span className="font-bold text-slate-600">
                    Prumo
                  </span>
                </a>
              </footer>
            ) : null}
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
              <div className="truncate text-lg font-black text-[#059669]">
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
