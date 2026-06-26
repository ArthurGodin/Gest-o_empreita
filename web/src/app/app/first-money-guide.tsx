"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isExpanded, setIsExpanded] = useState(true);
  
  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? steps.at(-1);
  const progressPct = Math.round((doneCount / steps.length) * 100);

  if (!nextStep || doneCount === steps.length) return null;

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between bg-card hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Rocket className="h-4 w-4" />
          </span>
          <div>
            <p className="text-base font-semibold">
              Roteiro para receber a primeira entrada
            </p>
            {!isExpanded && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {doneCount}/{steps.length} passos concluídos
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isExpanded && (
            <span className="hidden sm:inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {doneCount}/{steps.length} concluído
            </span>
          )}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-muted-foreground shrink-0">
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="p-4 sm:p-5">
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Um caminho guiado para sair da proposta enviada até a
                  primeira entrada registrada no financeiro.
                </p>

                <div className="mt-4 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {steps.map((step, index) => (
                    <Link
                      key={step.title}
                      href={step.href}
                      className={`min-h-[104px] rounded-lg border px-3 py-3 transition-colors hover:border-primary/40 hover:bg-accent ${
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

              <aside className="border-t bg-[#fff7ed] p-4 sm:p-5 lg:border-l lg:border-t-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2f8f4e]" />
                    <div>
                      <p className="text-sm font-semibold">Próxima melhor ação</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {nextStep.title}: {nextStep.detail}
                      </p>
                    </div>
                  </div>
                  <Button asChild className="mt-6 w-full">
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
