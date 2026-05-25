"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDocument, formatPhone, whatsappLink } from "@/lib/format";
import type { Customer } from "@/lib/queries/customers";

interface CustomerListProps {
  customers: Customer[];
}

export function CustomerList({ customers }: CustomerListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return customers.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (qDigits && c.phone?.replace(/\D/g, "").includes(qDigits)) return true;
      if (qDigits && c.document?.replace(/\D/g, "").includes(qDigits)) return true;
      if (c.city?.toLowerCase().includes(q)) return true;
      if (c.state?.toLowerCase().includes(q)) return true;
      if (c.email?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [customers, query]);

  return (
    <div className="space-y-4">
      {/* ── Busca ─────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, telefone ou cidade..."
          className="pl-9"
        />
      </div>

      {/* ── Contagem ──────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        {filtered.length === customers.length
          ? `${customers.length} ${customers.length === 1 ? "cliente" : "clientes"}`
          : `${filtered.length} de ${customers.length}`}
      </p>

      {/* ── Lista ─────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
          Nenhum cliente bate com{" "}
          <span className="font-medium text-foreground">&quot;{query}&quot;</span>.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <li key={customer.id}>
              <CustomerCard customer={customer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const phoneFormatted = formatPhone(customer.phone);
  const documentFormatted = formatDocument(customer.document);
  const waLink = whatsappLink(customer.phone);

  // "Stretched link" pattern com pointer-events:
  //  - O card inteiro é a área de tap (a:after preenche o card via absolute inset-0).
  //  - O conteúdo NÃO captura clicks (pointer-events-none), exceto o link interno do Zap
  //    que opta-in via pointer-events-auto.
  //  - Resultado: tap em qualquer lugar do card abre /app/clientes/[id], menos o botão Zap
  //    que abre wa.me.
  return (
    <div className="group relative rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 focus-within:border-primary/40">
      <Link
        href={`/app/clientes/${customer.id}`}
        aria-label={`Abrir ${customer.name}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      <div className="pointer-events-none relative space-y-2">
        <div>
          <h3 className="font-semibold leading-tight">{customer.name}</h3>
          {documentFormatted && (
            <p className="text-xs text-muted-foreground">{documentFormatted}</p>
          )}
        </div>

        {phoneFormatted && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{phoneFormatted}</span>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto relative ml-auto inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                aria-label="Abrir conversa no WhatsApp"
              >
                <MessageCircle className="h-3 w-3" />
                Zap
              </a>
            )}
          </div>
        )}

        {(customer.city || customer.state) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {[customer.city, customer.state].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
