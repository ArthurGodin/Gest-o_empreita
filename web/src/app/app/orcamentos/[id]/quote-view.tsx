import { Calendar, Mail, MapPin, Phone, User } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { formatPhone } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/quote-status";
import type { QuoteWithRelations } from "@/lib/queries/quotes";

/**
 * Modo read-only do orçamento (quando status != draft).
 * Mostra cliente, validade, itens, total, observações e status atual.
 * Empreiteiro precisa duplicar pra editar.
 */
export function QuoteView({ quote }: { quote: QuoteWithRelations }) {
  const total = quote.total_cents;

  return (
    <div className="space-y-6">
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
        {quote.approved_at && (
          <span className="ml-2 text-muted-foreground">
            · Aprovado em {formatDateBR(quote.approved_at)}
          </span>
        )}
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
                  {item.quantity} {item.unit} × {formatBRL(item.unit_price_cents / 100)}
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
