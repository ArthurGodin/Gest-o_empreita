"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getActivationGoalOptions,
  type ActivationGoal,
} from "@/lib/activation-goals";
import type { ActivationProgress } from "@/lib/activation/activation-core";
import { trackProductEvent } from "@/lib/product-analytics";
import { updateActivationGoalAction } from "./activation-actions";

export function FirstMoneyGuide({
  progress,
  canChangeGoal,
}: {
  progress: ActivationProgress;
  canChangeGoal: boolean;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [optimisticGoal, setOptimisticGoal] = useState<ActivationGoal | null>(
    null,
  );
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalPending, startGoalTransition] = useTransition();
  const {
    guideTitle,
    steps,
    nextStep,
    doneCount,
    totalCount,
    progressPercent,
    isComplete,
  } = progress;

  useEffect(() => {
    if (!isComplete) return;
    const key = `prumo:activation-completed:${progress.goal}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
      trackProductEvent("activation_goal_completed", {
        activation_goal: progress.goal,
        business_segment: progress.segment,
      });
    } catch {
      // Analytics must never block the dashboard.
    }
  }, [isComplete, progress.goal, progress.segment]);

  function changeGoal(goal: ActivationGoal) {
    if (goal === progress.goal || goalPending) return;
    const previousGoal = progress.goal;
    setOptimisticGoal(goal);
    setGoalError(null);

    startGoalTransition(async () => {
      const result = await updateActivationGoalAction({ goal });
      if (!result.ok) {
        setOptimisticGoal(null);
        setGoalError(result.error);
        return;
      }

      trackProductEvent("activation_goal_changed", {
        business_segment: progress.segment,
        from_goal: previousGoal,
        to_goal: goal,
      });
      router.refresh();
    });
  }

  function trackNextStep() {
    if (!nextStep) return;
    trackProductEvent("activation_goal_next_step_opened", {
      activation_goal: progress.goal,
      business_segment: progress.segment,
      step: nextStep.id,
    });
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) trackProductEvent("activation_guide_expanded");
            setIsExpanded(!isExpanded);
          }}
          aria-expanded={isExpanded}
          aria-controls="activation-steps"
          className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                isComplete
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ListChecks className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                {guideTitle}
              </h2>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {doneCount} de {totalCount} concluídos
                {nextStep ? ` · próximo: ${nextStep.title}` : " · objetivo concluído"}
              </span>
            </span>
          </span>
          <span
            className={`shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ChevronDown aria-hidden="true" className="h-5 w-5" />
          </span>
        </button>

        {nextStep ? (
          <div className="hidden border-l px-3 lg:block">
            <Button asChild size="sm">
              <Link href={nextStep.href} onClick={trackNextStep}>
                {nextStep.action}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {!isExpanded && nextStep ? (
        <div className="border-t p-3 lg:hidden">
          <Button asChild className="w-full">
            <Link href={nextStep.href} onClick={trackNextStep}>
              {nextStep.action}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}

      {isExpanded ? (
        <div id="activation-steps" className="border-t">
          <div className="px-4 pt-4">
            <div
              role="progressbar"
              aria-label="Progresso da ativação"
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-valuenow={doneCount}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid border-t sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
              const isNext = step.id === nextStep?.id;

              return (
                <Link
                  key={step.id}
                  href={step.href}
                  aria-current={isNext ? "step" : undefined}
                  className={`flex min-h-16 items-start gap-2.5 border-b px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:border-r xl:[&:nth-child(4n)]:border-r-0 ${
                    isNext
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-accent/60"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isNext ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase leading-4 text-muted-foreground">
                      Etapa {index + 1}
                    </span>
                    <span className="block text-sm font-medium leading-5">
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {step.detail}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-3 border-t p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            {canChangeGoal ? (
              <div className="min-w-0">
                <label
                  htmlFor="activation-goal"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Objetivo atual
                </label>
                <select
                  id="activation-goal"
                  value={optimisticGoal ?? progress.goal}
                  disabled={goalPending}
                  onChange={(event) =>
                    changeGoal(event.target.value as ActivationGoal)
                  }
                  className="h-11 w-full max-w-md rounded-md border border-input bg-card px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60 md:text-sm"
                >
                  {getActivationGoalOptions(progress.segment).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.title}
                    </option>
                  ))}
                </select>
                {goalError ? (
                  <p role="alert" className="mt-1.5 text-xs text-destructive">
                    {goalError}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                O objetivo é definido pelos responsáveis da empresa.
              </p>
            )}

            {nextStep ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href={nextStep.href} onClick={trackNextStep}>
                  {nextStep.action}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Objetivo inicial concluído
              </span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
