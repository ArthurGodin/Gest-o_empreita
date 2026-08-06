"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const questions = [
  {
    question: "Preciso instalar alguma coisa?",
    answer:
      "Não. O Prumo funciona 100% no navegador, no celular ou no computador. Basta criar a conta e começar.",
  },
  {
    question: "Meu cliente precisa criar conta para aprovar?",
    answer:
      "Não. Ele recebe um link único e privado, abre no celular, revisa a proposta ou orçamento e registra a decisão.",
  },
  {
    question: "Como funciona o Pix?",
    answer:
      "Você escolhe entre Pix direto na sua chave, com confirmação manual pelo extrato, ou Asaas, com cobrança e baixa pelo provedor. O Prumo organiza entrada e saldo por projeto ou obra.",
  },
  {
    question: "E se eu quiser cancelar?",
    answer:
      "O proprietário cancela na tela de planos. A recorrência é encerrada e a conta volta ao Grátis imediatamente. O cancelamento comum não gera reembolso automático, sem prejuízo dos direitos previstos em lei.",
  },
  {
    question: "Tem período de teste?",
    answer:
      "Não há teste temporário. Existe um Plano Grátis, sem cartão, com até 3 propostas ou orçamentos por mês e 1 projeto ou obra simultânea.",
  },
  {
    question: "Para quais profissionais o Prumo serve?",
    answer:
      "Arquitetura, design de interiores, engenharia e execução de obras. Cada perfil recebe linguagem e modelos iniciais adequados, com itens e etapas editáveis.",
  },
] as const;

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center md:mb-10">
          <h2 className="text-3xl font-extrabold leading-tight text-foreground md:text-5xl">
            Dúvidas frequentes
          </h2>
          <p className="mt-3 text-base font-medium leading-7 text-muted-foreground md:text-lg">
            O que você precisa saber antes de começar.
          </p>
        </div>

        <div className="space-y-3">
          {questions.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = `landing-faq-button-${index}`;
            const answerId = `landing-faq-answer-${index}`;

            return (
              <div
                key={item.question}
                data-reveal="up"
                style={
                  { "--reveal-delay": `${index * 45}ms` } as CSSProperties
                }
                className={cn(
                  "landing-faq-item group relative overflow-hidden rounded-lg border bg-card shadow-sm",
                  isOpen && "landing-faq-item-open border-primary/30 shadow-md",
                )}
              >
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left text-[0.95rem] font-bold text-foreground outline-none transition-colors duration-200 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5 md:text-base"
                >
                  <span className="pr-2">{item.question}</span>
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-[transform,background-color,border-color,color] duration-300",
                      isOpen &&
                        "rotate-180 border-primary/25 bg-primary/10 text-primary",
                    )}
                  >
                    <ChevronDown aria-hidden="true" className="h-4 w-4" />
                  </span>
                </button>
                <div
                  id={answerId}
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!isOpen}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p
                      className={cn(
                        "border-t px-4 py-4 text-sm font-medium leading-6 text-muted-foreground transition-[opacity,transform,border-color] duration-300 md:px-5",
                        isOpen
                          ? "translate-y-0 border-border opacity-100"
                          : "-translate-y-1 border-transparent opacity-0",
                      )}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
