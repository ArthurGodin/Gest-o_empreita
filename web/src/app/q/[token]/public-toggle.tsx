"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  FileText,
  PackageCheck,
  WalletCards,
} from "lucide-react";
import type { EffectiveQuoteStatus } from "@/lib/quote-status";
import {
  PublicQuoteView,
  type PublicQuoteViewData,
} from "./public-quote-view";
import { AndamentoView, type PublicProjectView } from "./andamento-view";
import { PublicBillingView } from "./public-billing-view";
import {
  PublicDeliverablesView,
  type PublicDeliverableView,
} from "./public-deliverables-view";
import {
  getBusinessVocabulary,
  normalizeBusinessSegment,
} from "@/lib/business-segment";

type PublicView = "orcamento" | "andamento" | "entregas" | "cobranca";

interface PublicToggleProps {
  quote: PublicQuoteViewData;
  status: EffectiveQuoteStatus;
  project: PublicProjectView | null;
  deliverables: PublicDeliverableView[];
  shareToken: string;
  nowMs: number;
}

function isPublicView(value: string | null): value is PublicView {
  return (
    value === "orcamento" ||
    value === "andamento" ||
    value === "entregas" ||
    value === "cobranca"
  );
}

export function PublicToggle({
  quote,
  status,
  project,
  deliverables,
  shareToken,
  nowMs,
}: PublicToggleProps) {
  const vocabulary = getBusinessVocabulary(
    quote.company.business_segment,
  );
  const businessSegment = normalizeBusinessSegment(
    quote.company.business_segment,
  );
  const tabs: Array<{
    value: PublicView;
    label: string;
    icon: typeof ClipboardList;
  }> = [
    { value: "andamento", label: "Andamento", icon: ClipboardList },
    ...(deliverables.length > 0
      ? [
          {
            value: "entregas" as const,
            label: "Entregas",
            icon: PackageCheck,
          },
        ]
      : []),
    { value: "cobranca", label: "Cobrança", icon: WalletCards },
    { value: "orcamento", label: vocabulary.quoteSingular, icon: FileText },
  ];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasProject = project !== null;
  const hasPendingDeliverable = deliverables.some(
    (deliverable) => !deliverable.current_version.review,
  );
  const hasBlockingDeliverable = deliverables.some(
    (deliverable) =>
      deliverable.current_version.review?.action !== "approved",
  );
  const deliveryApprovedAt = project?.delivery_approved_at ?? null;
  const hasActionableCharge =
    project?.charges.some(
      (charge) =>
        charge.status === "pending" ||
        charge.status === "overdue" ||
        (charge.kind === "saldo" &&
          charge.status === "draft" &&
          Boolean(deliveryApprovedAt)),
    ) ?? false;
  const defaultView: PublicView = hasProject
    ? hasActionableCharge
      ? "cobranca"
      : hasPendingDeliverable
        ? "entregas"
      : "andamento"
    : "orcamento";
  const requestedView = searchParams.get("tab");
  const view =
    hasProject &&
    isPublicView(requestedView) &&
    tabs.some((tab) => tab.value === requestedView)
      ? requestedView
      : defaultView;

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
    return (
      <PublicQuoteView
        quote={quote}
        status={status}
        shareToken={shareToken}
        nowMs={nowMs}
      />
    );
  }

  return (
    <div className="min-h-svh bg-background px-4 py-4 text-foreground sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-5xl">
      <div
        className="mx-auto mb-4 grid max-w-2xl grid-flow-col auto-cols-fr gap-1 rounded-lg border bg-card p-1 shadow-sm"
        role="tablist"
        aria-label="Visões do acompanhamento"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.value;
          return (
            <button
              key={tab.value}
              id={`public-tab-${tab.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`public-panel-${tab.value}`}
              onClick={() => selectView(tab.value)}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10 sm:flex-row sm:px-2 sm:py-2 sm:text-sm ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`public-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`public-tab-${view}`}
      >
        {view === "andamento" ? (
          <AndamentoView
            view={project}
            shareToken={shareToken}
            businessSegment={businessSegment}
          />
        ) : view === "entregas" ? (
          <PublicDeliverablesView
            deliverables={deliverables}
            shareToken={shareToken}
            businessSegment={businessSegment}
          />
        ) : view === "cobranca" ? (
          <PublicBillingView
            charges={project.charges}
            projectStatus={project.status}
            deliveryApprovedAt={project.delivery_approved_at}
            deliveryAcceptance={project.delivery_acceptance}
            hasPendingDeliverables={hasBlockingDeliverable}
            shareToken={shareToken}
            businessSegment={businessSegment}
            paymentInstructions={quote.company?.pix_instructions ?? null}
          />
        ) : (
          <PublicQuoteView
            quote={quote}
            status={status}
            shareToken={shareToken}
            nowMs={nowMs}
          />
        )}
      </div>
      </div>
    </div>
  );
}
