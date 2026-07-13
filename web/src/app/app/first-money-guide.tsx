"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Rocket,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FirstMoneyStep {
  title: string;
  detail: string;
  href: string;
  action: string;
  done: boolean;
}

export function FirstMoneyGuide({ steps }: { steps: FirstMoneyStep[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? steps.at(-1);
  const progressPct = Math.round((doneCount / steps.length) * 100);

  if (!nextStep || doneCount === steps.length) return null;

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="first-money-steps"
        className="flex min-h-16 w-full items-center justify-between bg-card p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Rocket className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950 sm:text-base">
              Roteiro para receber a primeira entrada
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {!isExpanded
                ? `${doneCount}/${steps.length} passos concluídos · próximo: ${nextStep.title}`
                : `${doneCount}/${steps.length} passos concluídos`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isExpanded && (
            <span className="hidden sm:inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {doneCount}/{steps.length} concluído
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
            className="shrink-0 text-muted-foreground"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="first-money-steps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.22,
              ease: "easeOut",
            }}
            className="overflow-hidden"
          >
            <div className="grid gap-0 border-t lg:grid-cols-[minmax(0,1fr)_17rem]">
              <div className="p-4">
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Um caminho guiado para sair da proposta enviada até a
                  primeira entrada registrada no financeiro.
                </p>

                <div className="mt-4 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {steps.map((step, index) => (
                    <Link
                      key={step.title}
                      href={step.href}
                      className={`min-h-[84px] rounded-md border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        step.done ? "bg-primary/5" : "bg-background"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        {step.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold uppercase leading-4 text-muted-foreground">
                            Passo {index + 1}
                          </span>
                          <span className="block text-sm font-medium leading-5">
                            {step.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {step.detail}
                          </span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <aside className="flex flex-col justify-between border-t bg-commercial/5 p-4 lg:border-l lg:border-t-0">
                <div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Próxima melhor ação</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {nextStep.title}: {nextStep.detail}
                      </p>
                    </div>
                  </div>
                  <Button asChild className="mt-5 w-full">
                    <Link href={nextStep.href}>
                      {nextStep.action}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Quando esses passos ficam verdes, o app já provou valor: proposta
                  enviada, aceite registrado e primeira entrada no controle.
                </p>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
