"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDocumentMasked, formatPhone, whatsappLink } from "@/lib/format";
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
    return customers.filter((customer) => {
      if (customer.name.toLowerCase().includes(q)) return true;
      if (qDigits && customer.phone?.replace(/\D/g, "").includes(qDigits)) {
        return true;
      }
      if (qDigits && customer.document?.replace(/\D/g, "").includes(qDigits)) {
        return true;
      }
      if (customer.city?.toLowerCase().includes(q)) return true;
      if (customer.state?.toLowerCase().includes(q)) return true;
      if (customer.email?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [customers, query]);

  return (
    <div className="space-y-3">
      <section
        aria-label="Busca de clientes"
        className="rounded-lg border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="customer-search"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, telefone ou cidade…"
            aria-label="Buscar clientes"
            className="pl-9"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {filtered.length === customers.length
            ? `${customers.length} ${customers.length === 1 ? "cliente" : "clientes"}`
            : `${filtered.length} de ${customers.length}`}
        </p>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado para “{query}”.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] gap-4 border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
            <span>Cliente</span>
            <span>Telefone</span>
            <span>Local</span>
            <span className="w-11 text-center">Contato</span>
          </div>
          <ul className="divide-y">
            {filtered.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CustomerRow({ customer }: { customer: Customer }) {
  const phoneFormatted = formatPhone(customer.phone);
  const documentFormatted = formatDocumentMasked(customer.document);
  const waLink = whatsappLink(customer.phone);
  const location = [customer.city, customer.state].filter(Boolean).join(", ");

  return (
    <li className="group relative grid min-h-[104px] grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-slate-50 focus-within:bg-slate-50 md:min-h-16 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] md:items-center md:gap-4 md:py-3">
      <Link
        href={`/app/clientes/${customer.id}`}
        aria-label={`Abrir ${customer.name}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />

      <span className="pointer-events-none col-span-2 min-w-0 md:col-span-1">
        <span
          title={customer.name}
          className="block truncate text-sm font-semibold text-slate-950"
        >
          {customer.name}
        </span>
        {documentFormatted ? (
          <span className="block text-xs text-muted-foreground">
            {documentFormatted}
          </span>
        ) : null}
      </span>

      <span className="pointer-events-none flex min-w-0 items-center gap-2 text-sm text-slate-600">
        <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0 md:hidden" />
        <span className="truncate">{phoneFormatted ?? "Sem telefone"}</span>
      </span>

      <span className="pointer-events-none flex min-w-0 items-center gap-2 text-sm text-slate-600">
        <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 md:hidden" />
        <span className="truncate">{location || "Sem cidade"}</span>
      </span>

      {waLink ? (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir conversa no WhatsApp"
          aria-label={`Abrir WhatsApp de ${customer.name}`}
          className="pointer-events-auto relative col-start-2 row-span-2 row-start-2 inline-flex h-11 w-11 items-center justify-center self-center justify-self-end rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-start-4 md:row-span-1 md:row-start-1"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      ) : (
        <span className="pointer-events-none col-start-2 row-span-2 row-start-2 self-center justify-self-end text-xs text-muted-foreground md:col-start-4 md:row-span-1 md:row-start-1">
          —
        </span>
      )}
    </li>
  );
}
