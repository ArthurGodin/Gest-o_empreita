"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QUOTE_DRAFT_LIMITS } from "./quote-draft";

export function QuoteNotesSection({
  notes,
  error,
  onChange,
}: {
  notes: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">
        Observações para o cliente
      </h2>
      <Label htmlFor="notes" className="sr-only">
        Observações que aparecem no link do cliente
      </Label>
      <Textarea
        id="notes"
        name="notes"
        value={notes}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex: Pagamento em 3x sem juros. Início em 5 dias úteis após aprovação…"
        rows={3}
        maxLength={QUOTE_DRAFT_LIMITS.notes}
        autoComplete="off"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? "notes-error" : "notes-help"}
        className={error ? "border-destructive" : undefined}
      />
      {error ? (
        <p id="notes-error" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id="notes-help" className="mt-1.5 text-xs text-muted-foreground">
          Este texto aparece no link público e no PDF.
        </p>
      )}
    </section>
  );
}
