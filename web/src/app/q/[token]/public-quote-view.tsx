import { CalendarDays, CheckCircle2, Clock, Download, MessageSquare, Phone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { formatPhone } from "@/lib/format";
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
}: {
  quote: PublicQuoteData;
  status: EffectiveQuoteStatus;
}) {
  const daysUntilExpiry = quote.valid_until
    ? Math.ceil(
        (new Date(quote.valid_until).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const lastApproval = quote.approvals[quote.approvals.length - 1];

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 sm:py-10">
        {/* ── Header da empresa ────────────────────────────────────── */}
        <header className="flex items-center gap-3 rounded-xl border bg-card p-4">
          {quote.company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.company.logo_url}
              alt={quote.company.name}
              className="h-12 w-12 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
              {quote.company.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{quote.company.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
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
        </header>

        {/* ── Título do orçamento ──────────────────────────────────── */}
        <section className="rounded-xl border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Orçamento {quote.number}
          </div>
          <h1 className="mt-1 text-xl font-semibold leading-tight">
            {quote.title}
          </h1>
          {quote.customer && (
            <div className="mt-2 text-sm text-muted-foreground">
              Para:{" "}
              <span className="font-medium text-foreground">
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
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {quote.description}
            </p>
          )}
        </section>

        {/* ── Status banner ────────────────────────────────────────── */}
        {status === "approved" && quote.approved_at && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">Orçamento aprovado ✓</div>
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
          <div className="rounded-xl border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-semibold">Orçamento com pedido de mudanças</div>
                <div className="text-sm text-muted-foreground">
                  {lastApproval?.signer_name && (
                    <>Resposta de <strong>{lastApproval.signer_name}</strong>{" · "}</>
                  )}
                  {formatDateBR(quote.rejected_at)}
                </div>
                {lastApproval?.rejection_reason && (
                  <div className="mt-2 rounded-md bg-background/80 p-3 text-sm">
                    <div className="text-xs font-medium text-muted-foreground">
                      Motivo
                    </div>
                    <div className="mt-1">{lastApproval.rejection_reason}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {status === "expired" && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">Esse orçamento expirou</div>
                <div className="text-sm">
                  Validade era{" "}
                  {quote.valid_until && formatDateBR(quote.valid_until)}. Peça um
                  novo ao {quote.company.name}.
                </div>
              </div>
            </div>
          </div>
        )}

        {(status === "sent" || status === "viewed") && quote.valid_until && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <CalendarDays className="-mt-0.5 mr-1 inline h-4 w-4" />
            Válido até{" "}
            <strong>{formatDateBR(quote.valid_until)}</strong>
            {daysUntilExpiry != null && daysUntilExpiry > 0 && (
              <span>
                {" — "}
                {daysUntilExpiry === 1
                  ? "falta 1 dia"
                  : `faltam ${daysUntilExpiry} dias`}
              </span>
            )}
          </div>
        )}

        {/* ── Itens ────────────────────────────────────────────────── */}
        <section className="rounded-xl border bg-card p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Itens
          </div>
          <ul className="mt-2 divide-y">
            {quote.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <div className="flex-1">
                  <div className="font-medium leading-tight">
                    {item.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} × {formatBRL(item.unit_price_cents / 100)}
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {formatBRL(item.total_cents / 100)}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-3xl font-bold text-primary">
              {formatBRL(quote.total_cents / 100)}
            </span>
          </div>
        </section>

        {/* ── Observações ──────────────────────────────────────────── */}
        {quote.notes && (
          <section className="rounded-xl border bg-card p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Observações
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{quote.notes}</p>
          </section>
        )}

        {/* ── Aprovação (apenas sent/viewed) ───────────────────────── */}
        {(status === "sent" || status === "viewed") && (
          <ApprovalForm token={quote.share_token} />
        )}

        {/* ── Baixar PDF (sempre disponível) ────────────────────────── */}
        {status !== "expired" && (
          <div className="flex justify-center">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a
                href={`/q/${quote.share_token}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Baixar PDF do orçamento
              </a>
            </Button>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="pt-2 pb-6 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Link único e privado — só você tem acesso
          </div>
          <div className="mt-2">
            Gerado por{" "}
            <span className="font-medium text-foreground">Gestão Empreita</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
