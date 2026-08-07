"use client";

import { useState } from "react";
import { CheckCircle2, Eye, FileText, ShieldCheck } from "lucide-react";
import type { PublicDemoScenario } from "@/lib/public-demo";
import {
  formatPublicDemoCurrency,
  publicDemoQuoteTotal,
} from "@/lib/public-demo";
import { cn } from "@/lib/utils";
import {
  DemoProtectedNote,
  DemoStatus,
  DemoViewHeader,
} from "./demo-shared";

export function DemoQuote({ scenario }: { scenario: PublicDemoScenario }) {
  const [perspective, setPerspective] = useState<"internal" | "client">(
    "internal",
  );
  const totalCents = publicDemoQuoteTotal(scenario);

  return (
    <div className="space-y-5">
      <DemoViewHeader
        eyebrow={`${scenario.quoteLabel} ${scenario.quoteNumber}`}
        title={scenario.quoteTitle}
        description={`Escopo e valores organizados antes do envio para ${scenario.customerName.toLowerCase()}.`}
        status={<DemoStatus tone="success">{scenario.quoteStatus}</DemoStatus>}
      />

      <div
        role="group"
        aria-label="Perspectiva da proposta"
        className="inline-flex rounded-lg border bg-muted/50 p-1"
      >
        {[
          { id: "internal" as const, label: "Visão interna", icon: FileText },
          { id: "client" as const, label: "Visão do cliente", icon: Eye },
        ].map((option) => {
          const Icon = option.icon;
          const active = perspective === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setPerspective(option.id)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      {perspective === "internal" ? (
        <section aria-label="Itens da proposta" className="overflow-hidden rounded-lg border">
          <div className="hidden grid-cols-[minmax(0,1fr)_6rem_8rem] gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground sm:grid">
            <span>Item</span>
            <span>Quantidade</span>
            <span className="text-right">Subtotal</span>
          </div>
          <div className="divide-y bg-card">
            {scenario.quoteItems.map((item) => (
              <div
                key={item.description}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.description}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                    {item.quantity} {item.unit} · {formatPublicDemoCurrency(item.unitPriceCents)}
                  </p>
                </div>
                <span className="hidden text-sm text-muted-foreground sm:block">
                  {item.quantity} {item.unit}
                </span>
                <span className="text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatPublicDemoCurrency(
                    item.quantity * item.unitPriceCents,
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-end justify-between gap-4 border-t bg-muted/40 px-4 py-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Válida até {scenario.quoteValidUntil}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                Total da {scenario.quoteLabel.toLowerCase()}
              </p>
            </div>
            <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatPublicDemoCurrency(totalCents)}
            </p>
          </div>
        </section>
      ) : (
        <section
          aria-label="Prévia da visão do cliente"
          className="overflow-hidden rounded-lg border bg-card"
        >
          <div className="flex items-center justify-between gap-3 bg-[#07100c] px-4 py-3 text-white">
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600">
                <FileText aria-hidden="true" className="h-4 w-4" />
              </span>
              Prumo
            </span>
            <span className="text-xs font-semibold text-emerald-200">
              Link protegido
            </span>
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {scenario.organizationName}
            </p>
            <h3 className="mt-2 text-xl font-bold text-foreground">
              {scenario.quoteTitle}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Preparada para {scenario.customerName}
            </p>
            <div className="mt-5 grid gap-3 border-y py-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Valor total</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                  {formatPublicDemoCurrency(totalCents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Situação</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Decisão registrada
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-muted/60 p-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              />
              <p className="text-sm leading-5 text-muted-foreground">
                Na experiência real, o cliente revisa e decide pelo celular sem
                criar conta. Aqui a decisão é apenas ilustrativa.
              </p>
            </div>
          </div>
        </section>
      )}

      <DemoProtectedNote>
        Esta proposta é inteiramente fictícia. Nenhuma decisão, envio ou PDF é
        criado nesta demonstração pública.
      </DemoProtectedNote>
    </div>
  );
}
