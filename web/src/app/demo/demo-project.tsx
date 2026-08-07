import { CheckCircle2, Circle, Clock3, ClipboardList } from "lucide-react";
import type { PublicDemoScenario } from "@/lib/public-demo";
import { cn } from "@/lib/utils";
import {
  DemoProgress,
  DemoStatus,
  DemoViewHeader,
} from "./demo-shared";

export function DemoProject({ scenario }: { scenario: PublicDemoScenario }) {
  return (
    <div className="space-y-5">
      <DemoViewHeader
        eyebrow={scenario.projectLabel}
        title={scenario.projectName}
        description={`${scenario.projectPeriod}. Etapas e decisões reunidas no contexto do trabalho.`}
        status={<DemoStatus tone="attention">{scenario.projectStatus}</DemoStatus>}
      />

      <section className="rounded-lg border bg-muted/20 p-4">
        <DemoProgress
          value={scenario.projectProgress}
          label={`Andamento do ${scenario.projectLabel.toLowerCase()}`}
        />
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold uppercase text-primary">
            Próximo marco
          </p>
          <p className="mt-1 text-base font-bold text-foreground">
            {scenario.nextMilestone}
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {scenario.nextMilestoneDetail}
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <section aria-labelledby="project-stages-title">
          <h3 id="project-stages-title" className="mb-3 text-sm font-semibold">
            Etapas do trabalho
          </h3>
          <ol className="divide-y rounded-lg border bg-card">
            {scenario.stages.map((stage) => {
              const Icon =
                stage.status === "completed"
                  ? CheckCircle2
                  : stage.status === "active"
                    ? Clock3
                    : Circle;
              return (
                <li key={stage.title} className="flex gap-3 px-3 py-3 sm:px-4">
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      stage.status === "completed"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : stage.status === "active"
                          ? "text-amber-600 dark:text-amber-300"
                          : "text-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        {stage.title}
                      </p>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {stage.progress}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {stage.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="project-context-title">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList aria-hidden="true" className="h-4 w-4 text-primary" />
            <h3 id="project-context-title" className="text-sm font-semibold">
              {scenario.contextLabel}
            </h3>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <p className="border-b px-4 py-3 text-sm leading-5 text-muted-foreground">
              {scenario.contextDescription}
            </p>
            <dl className="divide-y">
              {scenario.contextItems.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 px-4 py-3 text-sm"
                >
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
