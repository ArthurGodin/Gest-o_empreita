import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileClock,
  Files,
  MessageSquareText,
} from "lucide-react";
import type { PublicDemoScenario } from "@/lib/public-demo";
import { cn } from "@/lib/utils";
import {
  DemoProtectedNote,
  DemoStatus,
  DemoViewHeader,
} from "./demo-shared";

const statusCopy = {
  approved: { label: "Aprovada", tone: "success" as const, icon: FileCheck2 },
  review: { label: "Em análise", tone: "attention" as const, icon: Clock3 },
  draft: { label: "Rascunho", tone: "neutral" as const, icon: FileClock },
};

export function DemoDeliverables({
  scenario,
}: {
  scenario: PublicDemoScenario;
}) {
  const approved = scenario.deliverables.filter(
    (deliverable) => deliverable.status === "approved",
  ).length;

  return (
    <div className="space-y-5">
      <DemoViewHeader
        eyebrow="Entregas versionadas"
        title={`Materiais de ${scenario.projectName}`}
        description="Versões publicadas preservam o histórico de análise e retorno do cliente."
        status={
          <DemoStatus tone="success">
            {approved} {approved === 1 ? "aprovada" : "aprovadas"}
          </DemoStatus>
        }
      />

      <section aria-labelledby="deliverables-list-title">
        <div className="mb-3 flex items-center gap-2">
          <Files aria-hidden="true" className="h-4 w-4 text-primary" />
          <h3 id="deliverables-list-title" className="text-sm font-semibold">
            Histórico de entregas
          </h3>
        </div>
        <ol className="divide-y overflow-hidden rounded-lg border bg-card">
          {scenario.deliverables.map((deliverable, index) => {
            const meta = statusCopy[deliverable.status];
            const Icon = meta.icon;
            return (
              <li
                key={deliverable.title}
                className="grid gap-3 px-3 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start sm:px-4"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md border",
                    deliverable.status === "approved"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : deliverable.status === "review"
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {deliverable.title}
                    </p>
                    <span className="rounded border bg-muted/50 px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {deliverable.version}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {deliverable.updatedLabel}
                  </p>
                  <div className="mt-3 flex items-start gap-2 border-t pt-3 text-sm text-muted-foreground">
                    <MessageSquareText
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <p className="leading-5">{deliverable.note}</p>
                  </div>
                </div>
                <div className="pl-[3.25rem] sm:pl-0">
                  <DemoStatus tone={meta.tone}>{meta.label}</DemoStatus>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <CheckCircle2
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300"
        />
        <p className="text-sm leading-5 text-muted-foreground">
          Na operação real, a aprovação ou o pedido de ajuste fica associado à
          versão entregue.
        </p>
      </div>

      <DemoProtectedNote>
        Arquivos e retornos são demonstrativos. Esta rota não faz upload, não
        publica links e não registra decisões.
      </DemoProtectedNote>
    </div>
  );
}
