import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";
import type { PublicDemoScenario } from "@/lib/public-demo";
import {
  formatPublicDemoCurrency,
  publicDemoFinancials,
} from "@/lib/public-demo";
import {
  DemoMetricGrid,
  DemoProgress,
  DemoStatus,
  DemoViewHeader,
} from "./demo-shared";

export function DemoOverview({ scenario }: { scenario: PublicDemoScenario }) {
  const finance = publicDemoFinancials(scenario);

  return (
    <div className="space-y-5">
      <DemoViewHeader
        eyebrow={`${scenario.projectLabel} em destaque`}
        title={scenario.projectName}
        description={`${scenario.customerName}. Todos os dados desta tela são fictícios e existem apenas nesta demonstração.`}
        status={<DemoStatus tone="attention">{scenario.projectStatus}</DemoStatus>}
      />

      <DemoMetricGrid
        metrics={[
          {
            label: "Contratado",
            value: formatPublicDemoCurrency(finance.contractedCents),
            detail: `${scenario.quoteLabel} aprovada`,
          },
          {
            label: "Recebido",
            value: formatPublicDemoCurrency(finance.receivedCents),
            detail: "Valor simulado",
            tone: "positive",
          },
          {
            label: "Andamento",
            value: `${scenario.projectProgress}%`,
            detail: scenario.projectPeriod,
          },
          {
            label: "Entregas",
            value: String(scenario.deliverables.length),
            detail: "Com histórico de versão",
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)]">
        <section aria-labelledby="overview-stages-title" className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks aria-hidden="true" className="h-4 w-4 text-primary" />
            <h3 id="overview-stages-title" className="text-sm font-semibold">
              Etapas recentes
            </h3>
          </div>
          <ol className="divide-y rounded-lg border bg-card">
            {scenario.stages.slice(0, 3).map((stage) => (
              <li
                key={stage.title}
                className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center sm:px-4"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {stage.title}
                    </span>
                    {stage.status === "completed" ? (
                      <DemoStatus tone="success">Concluída</DemoStatus>
                    ) : stage.status === "active" ? (
                      <DemoStatus tone="attention">Em curso</DemoStatus>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {stage.detail}
                  </p>
                </div>
                <DemoProgress value={stage.progress} label={stage.title} />
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Próximo marco</h3>
            </div>
            <p className="mt-3 text-base font-bold leading-6 text-foreground">
              {scenario.nextMilestone}
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {scenario.nextMilestoneDetail}
            </p>
          </section>

          <section className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-foreground">
                {scenario.contextLabel}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {scenario.contextDescription}
            </p>
            <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs font-medium text-muted-foreground">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              {scenario.projectPeriod}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
