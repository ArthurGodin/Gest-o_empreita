"use client";

import { useState } from "react";
import { ClipboardList, FileText, WalletCards } from "lucide-react";
import type { EffectiveQuoteStatus } from "@/lib/quote-status";
import { PublicQuoteView } from "./public-quote-view";
import { AndamentoView, type PublicProjectView } from "./andamento-view";
import { PublicBillingView } from "./public-billing-view";

interface PublicToggleProps {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  quote: any;
  status: EffectiveQuoteStatus;
  project: PublicProjectView | null;
  shareToken: string;
  nowMs: number;
}

export function PublicToggle({
  quote,
  status,
  project,
  shareToken,
  nowMs,
}: PublicToggleProps) {
  const hasProject = project !== null;
  const [view, setView] = useState<"orcamento" | "andamento" | "cobranca">(
    hasProject ? "andamento" : "orcamento",
  );

  if (!hasProject) {
    return <PublicQuoteView quote={quote} status={status} nowMs={nowMs} />;
  }

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-2xl gap-2 rounded-lg border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView("andamento")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            view === "andamento"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Andamento da obra
        </button>
        <button
          type="button"
          onClick={() => setView("cobranca")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            view === "cobranca"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <WalletCards className="h-4 w-4" />
          Cobrança
        </button>
        <button
          type="button"
          onClick={() => setView("orcamento")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            view === "orcamento"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <FileText className="h-4 w-4" />
          Orçamento
        </button>
      </div>

      {view === "andamento" ? (
        <AndamentoView view={project} shareToken={shareToken} />
      ) : view === "cobranca" ? (
        <PublicBillingView
          charges={project.charges}
          projectStatus={project.status}
          deliveryApprovedAt={project.delivery_approved_at}
          shareToken={shareToken}
        />
      ) : (
        <PublicQuoteView quote={quote} status={status} nowMs={nowMs} />
      )}
    </div>
  );
}
