"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActivationProgress } from "@/lib/activation/activation-core";
import { trackProductEvent } from "@/lib/product-analytics";

export function FirstMoneyGuide({
  progress,
}: {
  progress: ActivationProgress;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    guideTitle,
    steps,
    nextStep,
    doneCount,
    totalCount,
    progressPercent,
    isComplete,
  } = progress;

  if (isComplete || !nextStep) return null;

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <button
          type="button"
          onClick={() =>
            setIsExpanded((current) => {
              if (!current) trackProductEvent("activation_guide_expanded");
              return !current;
            })
          }
          aria-expanded={isExpanded}
          aria-controls="activation-steps"
          className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
            >
              <ListChecks className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                {guideTitle}
              </h2>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {doneCount} de {totalCount} concluídos · próximo: {nextStep.title}
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

        <div className="hidden border-l px-3 lg:block">
          <Button asChild size="sm">
            <Link
              href={nextStep.href}
              onClick={() =>
                trackProductEvent("activation_next_step_opened", {
                  step: nextStep.id,
                })
              }
            >
              {nextStep.action}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {!isExpanded ? (
        <div className="border-t p-3 lg:hidden">
          <Button asChild className="w-full">
            <Link
              href={nextStep.href}
              onClick={() =>
                trackProductEvent("activation_next_step_opened", {
                  step: nextStep.id,
                })
              }
            >
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
              const isNext = step.id === nextStep.id;

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

          <div className="border-t p-3 lg:hidden">
            <Button asChild className="w-full">
              <Link
                href={nextStep.href}
                onClick={() =>
                  trackProductEvent("activation_next_step_opened", {
                    step: nextStep.id,
                  })
                }
              >
                {nextStep.action}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
