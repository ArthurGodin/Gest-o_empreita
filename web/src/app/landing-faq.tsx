"use client";

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
            const answerId = `landing-faq-answer-${index}`;

            return (
              <div
                key={item.question}
                className="overflow-hidden rounded-lg border bg-card shadow-sm"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left text-base font-bold text-foreground outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5"
                >
                  {item.question}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  id={answerId}
                  hidden={!isOpen}
                  className="border-t px-4 py-4 text-sm font-medium leading-6 text-muted-foreground md:px-5"
                >
                  {item.answer}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
