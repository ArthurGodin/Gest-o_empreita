import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crown,
  HardHat,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedAnchor } from "@/components/tracked-anchor";
import {
  formatPlanPrice,
  PLAN_DEFINITIONS,
  type AppPlan,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Preços - Prumo",
  description: "Planos Grátis, Pro e Ultimate do Prumo, com recursos e limites claros.",
};

const PLAN_SEQUENCE: AppPlan[] = ["free", "pro", "ultimate"];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-14 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="truncate text-lg">Prumo</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden min-[360px]:inline">Voltar</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/signup">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-center md:pb-10 md:pt-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
          <ShieldCheck className="h-4 w-4" />
          Plano mensal e cancelamento dentro do app
        </div>
        <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-5xl">
          Planos do Prumo
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
          Comece no Grátis sem cartão. Assine quando precisar remover limites,
          tirar a marca Prumo ou trabalhar com catálogo em lote.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4" aria-label="Planos disponíveis">
        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {PLAN_SEQUENCE.map((plan) => (
            <PricingCard key={plan} plan={plan} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-3xl px-4 text-center">
        <p className="text-sm leading-6 text-slate-600">
          O proprietário pode cancelar a assinatura na tela de planos. A conta
          volta ao Grátis imediatamente. O cancelamento comum não gera
          reembolso automático, sem prejuízo dos direitos previstos em lei.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-500">
          <Link href="/ajuda" className="hover:text-emerald-700 hover:underline">
            Central de Ajuda
          </Link>
          <Link href="/termos" className="hover:text-emerald-700 hover:underline">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-emerald-700 hover:underline">
            Privacidade
          </Link>
        </div>
      </section>
    </main>
  );
}

function PricingCard({ plan }: { plan: AppPlan }) {
  const definition = PLAN_DEFINITIONS[plan];
  const featured = plan === "pro";
  const Icon = plan === "ultimate" ? Crown : plan === "pro" ? Sparkles : ShieldCheck;
  const href = plan === "free" ? "/signup" : `/signup?plan=${plan}`;

  return (
    <article
      className={cn(
        "relative flex min-h-[480px] flex-col rounded-xl border bg-white p-5 shadow-sm md:p-6",
        featured && "border-slate-900 bg-slate-950 text-white shadow-lg",
      )}
    >
      {featured ? (
        <div className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-emerald-950">
          Recomendado
        </div>
      ) : null}

      <div
        className={cn(
          "mb-4 flex h-10 w-10 items-center justify-center rounded-lg",
          featured
            ? "bg-white/10 text-emerald-300"
            : "bg-emerald-50 text-emerald-700",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold">{definition.name}</h2>
      <p
        className={cn(
          "mt-2 min-h-[72px] text-sm leading-6",
          featured ? "text-slate-300" : "text-slate-600",
        )}
      >
        {definition.description}
      </p>

      <div className="my-5 flex items-end gap-1">
        <span className="text-4xl font-black tracking-tight">
          {plan === "free" ? "R$ 0" : formatPlanPrice(plan)}
        </span>
        {plan !== "free" ? (
          <span className={cn("mb-1 text-sm", featured ? "text-slate-400" : "text-slate-500")}>
            /mês
          </span>
        ) : null}
      </div>

      <Button
        asChild
        variant={featured ? "default" : "outline"}
        className={cn(
          "mb-6 h-11 w-full",
          featured && "bg-emerald-500 font-bold text-emerald-950 hover:bg-emerald-400",
        )}
      >
        <TrackedAnchor
          href={href}
          analyticsEvent="pricing_plan_clicked"
          analyticsProperties={{ plan, source: "pricing_page" }}
        >
          {plan === "free" ? "Começar grátis" : definition.cta}
          <ArrowRight className="h-4 w-4" />
        </TrackedAnchor>
      </Button>

      <ul className="mt-auto space-y-3">
        {definition.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-6">
            <CheckCircle2
              className={cn(
                "mt-1 h-4 w-4 shrink-0",
                featured ? "text-emerald-300" : "text-emerald-600",
              )}
            />
            <span className={featured ? "text-slate-200" : "text-slate-700"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
