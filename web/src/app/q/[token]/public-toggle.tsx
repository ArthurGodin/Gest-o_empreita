"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, FileText, WalletCards } from "lucide-react";
import type { EffectiveQuoteStatus } from "@/lib/quote-status";
import { PublicQuoteView } from "./public-quote-view";
import { AndamentoView, type PublicProjectView } from "./andamento-view";
import { PublicBillingView } from "./public-billing-view";

type PublicView = "orcamento" | "andamento" | "cobranca";

interface PublicToggleProps {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  quote: any;
  status: EffectiveQuoteStatus;
  project: PublicProjectView | null;
  shareToken: string;
  nowMs: number;
}

const tabs: Array<{
  value: PublicView;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { value: "andamento", label: "Andamento", icon: ClipboardList },
  { value: "cobranca", label: "Cobrança", icon: WalletCards },
  { value: "orcamento", label: "Orçamento", icon: FileText },
];

function isPublicView(value: string | null): value is PublicView {
  return value === "orcamento" || value === "andamento" || value === "cobranca";
}

export function PublicToggle({
  quote,
  status,
  project,
  shareToken,
  nowMs,
}: PublicToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasProject = project !== null;
  const defaultView: PublicView = hasProject ? "andamento" : "orcamento";
  const requestedView = searchParams.get("tab");
  const view =
    hasProject && isPublicView(requestedView) ? requestedView : defaultView;

  function selectView(nextView: PublicView) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === defaultView) {
      params.delete("tab");
    } else {
      params.set("tab", nextView);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  if (!hasProject) {
    return <PublicQuoteView quote={quote} status={status} nowMs={nowMs} />;
  }

  return (
    <div>
      <div
        className="mx-auto mb-4 flex max-w-2xl gap-2 rounded-lg border bg-card p-1 shadow-sm"
        role="tablist"
        aria-label="Visões do acompanhamento"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectView(tab.value)}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
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
