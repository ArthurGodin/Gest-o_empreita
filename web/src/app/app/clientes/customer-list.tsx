"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import {
  ListEmptyState,
  ListToolbar,
} from "@/components/app-shell/list-toolbar";
import { formatDocumentMasked, formatPhone, whatsappLink } from "@/lib/format";
import type { Customer } from "@/lib/queries/customers";
import { normalizeSearch } from "@/lib/search";

interface CustomerListProps {
  customers: Customer[];
}

export function CustomerList({ customers }: CustomerListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = normalizeSearch(query);
    const qDigits = q.replace(/\D/g, "");
    return customers.filter((customer) => {
      if (normalizeSearch(customer.name).includes(q)) return true;
      if (qDigits && customer.phone?.replace(/\D/g, "").includes(qDigits)) {
        return true;
      }
      if (qDigits && customer.document?.replace(/\D/g, "").includes(qDigits)) {
        return true;
      }
      if (normalizeSearch(customer.city ?? "").includes(q)) return true;
      if (normalizeSearch(customer.state ?? "").includes(q)) return true;
      if (normalizeSearch(customer.email ?? "").includes(q)) return true;
      return false;
    });
  }, [customers, query]);

  return (
    <div className="space-y-3">
      <ListToolbar
        ariaLabel="Busca de clientes"
        search={{
          value: query,
          onValueChange: setQuery,
          name: "customer-search",
          label: "Buscar clientes",
          placeholder: "Buscar por nome, telefone ou cidade…",
        }}
        summary={
          <p>
            {filtered.length === customers.length
              ? `${customers.length} ${customers.length === 1 ? "cliente" : "clientes"}`
              : `${filtered.length} de ${customers.length}`}
          </p>
        }
      />

      {filtered.length === 0 ? (
        <ListEmptyState
          title="Nenhum cliente encontrado"
          description={`Não encontramos cliente para “${query.trim()}”.`}
          actionLabel="Limpar busca"
          onAction={() => setQuery("")}
        />
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
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
        </a>
      ) : (
        <span className="pointer-events-none col-start-2 row-span-2 row-start-2 self-center justify-self-end text-xs text-muted-foreground md:col-start-4 md:row-span-1 md:row-start-1">
          —
        </span>
      )}
    </li>
  );
}
