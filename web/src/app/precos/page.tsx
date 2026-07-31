import Link from "next/link";
import type { Metadata } from "next";
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
import { ThemeIconButton } from "@/components/theme-control";
import { TrackedAnchor } from "@/components/tracked-anchor";
import {
  MarketingMotion,
  PricingCardFrame,
} from "@/components/marketing-motion";
import {
  formatPlanPrice,
  PLAN_DEFINITIONS,
  type AppPlan,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Preços do Prumo | Grátis, Pro e Ultimate",
  description:
    "Compare os planos Grátis, Pro e Ultimate do Prumo, com recursos, limites, cobrança mensal e cancelamento explicados com clareza.",
  alternates: {
    canonical: "/precos",
  },
  openGraph: {
    title: "Preços do Prumo | Grátis, Pro e Ultimate",
    description:
      "Planos honestos para organizar propostas, projetos, obras, cobranças e custos.",
    url: "/precos",
  },
};

const PLAN_SEQUENCE: AppPlan[] = ["free", "pro", "ultimate"];

export default function PricingPage() {
  return (
    <main className="pricing-page-surface min-h-screen pb-14 text-foreground">
      <MarketingMotion>
        <header className="landing-header-enter border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="truncate text-base min-[340px]:text-lg">Prumo</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeIconButton className="h-10 w-10" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/" aria-label="Voltar para o início" title="Voltar">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                <span className="hidden min-[400px]:inline">Voltar</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup" aria-label="Criar conta">
                <span className="hidden min-[340px]:inline">Criar conta</span>
                <span className="min-[340px]:hidden">Criar</span>
              </Link>
            </Button>
          </div>
        </div>
        </header>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-center md:pb-10 md:pt-14">
        <div className="pricing-heading-enter mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-semibold text-emerald-950 shadow-sm [--motion-delay:40ms] dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
          Plano mensal e cancelamento dentro do app
        </div>
        <h1 className="pricing-heading-enter text-3xl font-black leading-tight text-foreground [--motion-delay:90ms] md:text-5xl">
          Planos do Prumo
        </h1>
        <p className="pricing-heading-enter mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground [--motion-delay:140ms] md:text-lg">
          Comece no Grátis sem cartão. Assine quando precisar remover limites,
          tirar a marca Prumo ou trabalhar com catálogo em lote.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4" aria-label="Planos disponíveis">
        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {PLAN_SEQUENCE.map((plan, index) => (
            <PricingCard key={plan} plan={plan} index={index} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-3xl px-4 text-center">
        <p className="text-sm leading-6 text-muted-foreground">
          O proprietário pode cancelar a assinatura na tela de planos. A conta
          volta ao Grátis imediatamente. O cancelamento comum não gera
          reembolso automático, sem prejuízo dos direitos previstos em lei.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
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
      </MarketingMotion>
    </main>
  );
}

function PricingCard({ plan, index }: { plan: AppPlan; index: number }) {
  const definition = PLAN_DEFINITIONS[plan];
  const featured = plan === "pro";
  const Icon = plan === "ultimate" ? Crown : plan === "pro" ? Sparkles : ShieldCheck;
  const href = plan === "free" ? "/signup" : `/signup?plan=${plan}`;

  return (
    <PricingCardFrame
      featured={featured}
      index={index}
      className={cn(
        "relative flex min-h-[480px] flex-col overflow-hidden rounded-xl border p-5 md:p-6",
        featured
          ? "border-slate-800 bg-slate-950 text-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.9)]"
          : "border-border/90 bg-card/90 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl",
      )}
    >
      {featured ? <span aria-hidden="true" className="pricing-featured-edge" /> : null}
      {featured ? (
        <div className="absolute right-4 top-4 z-10 rounded-full border border-emerald-300/30 bg-emerald-400 px-3 py-1 text-xs font-bold text-emerald-950 shadow-sm md:right-5">
          Recomendado
        </div>
      ) : null}

      <div className="pricing-card-content flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-lg border",
            featured
              ? "border-white/10 bg-white/10 text-emerald-300 shadow-inner"
              : "border-emerald-100 bg-emerald-50 text-emerald-700",
          )}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold">{definition.name}</h2>
        <p
          className={cn(
            "mt-2 min-h-[72px] text-sm leading-6",
            featured ? "text-slate-300" : "text-muted-foreground",
          )}
        >
          {definition.description}
        </p>

        <div className="my-5 flex items-end gap-1 border-y border-current/10 py-5">
          <span className="pricing-price text-4xl font-black tracking-tight">
            {plan === "free" ? "R$ 0" : formatPlanPrice(plan)}
          </span>
          {plan !== "free" ? (
            <span
              className={cn(
                "mb-1 text-sm",
                featured ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              /mês
            </span>
          ) : null}
        </div>

        <Button
          asChild
          variant={featured ? "default" : "outline"}
          className={cn(
            "marketing-button mb-6 h-11 w-full rounded-lg",
            featured &&
              "bg-emerald-500 font-bold text-emerald-950 hover:bg-emerald-400",
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
              <span className={featured ? "text-slate-200" : "text-foreground"}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PricingCardFrame>
  );
}
