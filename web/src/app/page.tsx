import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  HardHat,
  LineChart,
  PackageCheck,
  Palette,
  PlayCircle,
  Ruler,
  ShieldCheck,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { LandingFaq } from "@/app/landing-faq";
import { LandingIntro } from "@/components/landing-intro";
import { MarketingMotion } from "@/components/marketing-motion";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { ThemeIconButton } from "@/components/theme-control";
import { Button } from "@/components/ui/button";
import { PrumoTopographyHero } from "@/components/ui/prumo-topography-hero";
import { legalIdentityState } from "@/lib/env-server";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
};

const workflow = [
  {
    title: "Monte a proposta",
    text: "Comece em branco ou use um modelo, revise escopo, valor e PDF.",
    icon: FileText,
  },
  {
    title: "Cliente aprova no celular",
    text: "Você envia o link. O cliente aprova ou pede revisão sem criar conta.",
    icon: Smartphone,
  },
  {
    title: "Aprovado vira projeto",
    text: "Converta em projeto ou obra e acompanhe etapas, registros e custos.",
    icon: HardHat,
  },
  {
    title: "Você cobra e acompanha a margem",
    text: "Organize entrada, saldo, recebimentos e custos no mesmo fluxo.",
    icon: LineChart,
  },
];

const professionalProfiles = [
  {
    title: "Arquitetura",
    text: "Propostas por escopo e projetos organizados por etapas.",
    icon: Ruler,
  },
  {
    title: "Design de interiores",
    text: "Modelos para projetos, consultorias e entregas de ambientes.",
    icon: Palette,
  },
  {
    title: "Engenharia",
    text: "Propostas técnicas, laudos e acompanhamentos em um só lugar.",
    icon: Building2,
  },
  {
    title: "Execução de obras",
    text: "Orçamentos, etapas, diário, custos e cobranças por obra.",
    icon: HardHat,
  },
] as const;

export default function LandingPage() {
  const legalIdentity = legalIdentityState.publicIdentity;

  return (
    <main className="relative overflow-x-hidden bg-background font-sans text-foreground selection:bg-emerald-700/20">
      <LandingIntro />
      <MarketingMotion>
      <header className="landing-header-enter fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070c0a]/95 text-white shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1 px-3 sm:gap-2 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="truncate text-base tracking-tight min-[340px]:text-lg">Prumo</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full font-medium text-white hover:bg-white/10 hover:text-white sm:inline-flex">
              <Link href="/precos">Preços</Link>
            </Button>
            <ThemeIconButton className="h-10 w-10 rounded-full border-white/15 bg-black/35 text-white hover:bg-white/10 hover:text-white" />
            <Button asChild variant="ghost" size="sm" className="rounded-full font-medium text-white hover:bg-white/10 hover:text-white">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="marketing-button rounded-full font-bold shadow-sm hover:bg-emerald-800">
              <TrackedAnchor
                href="/signup"
                analyticsEvent="marketing_cta_clicked"
                analyticsProperties={{ source: "landing_header", target: "signup" }}
              >
                <span className="hidden min-[380px]:inline">Começar grátis</span>
                <span className="min-[380px]:hidden">Grátis</span>
              </TrackedAnchor>
            </Button>
          </nav>
        </div>
      </header>

      <section className="landing-topography-hero relative isolate z-10 overflow-hidden bg-[#070c0a] pb-3 pt-[4.5rem] text-white min-[360px]:pt-[4.75rem] sm:pb-4 sm:pt-20 lg:pt-24">
        <PrumoTopographyHero />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-4">
          <div className="flex flex-col items-center text-center sm:max-w-2xl sm:items-start sm:text-left lg:max-w-[34rem] xl:max-w-[40rem]">
            <div className="landing-hero-enter mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-black/35 px-3 py-1.5 text-xs font-semibold text-emerald-100 shadow-sm backdrop-blur-sm [--motion-delay:40ms] sm:text-sm">
              <ShieldCheck className="h-4 w-4" />
              Propostas, projetos e financeiro
            </div>

            <h1 className="landing-hero-enter max-w-3xl text-[1.9rem] font-extrabold leading-[1.15] text-white [--motion-delay:90ms] min-[360px]:text-[2.125rem] min-[360px]:leading-tight sm:text-5xl">
              Prumo: proposta aprovada, projeto no controle.
            </h1>

            <p className="landing-hero-enter mt-3 max-w-xl text-sm font-medium leading-6 text-slate-300 [--motion-delay:140ms] min-[360px]:text-base min-[360px]:leading-7 sm:mt-4 sm:text-lg">
              Para arquitetura, interiores, engenharia e obras: apresente seu
              trabalho, receba aprovações e acompanhe projetos, custos e cobranças.
            </p>

            <div className="landing-hero-enter mt-4 flex w-full flex-col items-center gap-2 [--motion-delay:190ms] min-[380px]:w-auto min-[380px]:flex-row sm:mt-5">
              <Button
                asChild
                size="lg"
                className="marketing-button h-11 w-full max-w-[17rem] rounded-full px-5 text-base font-bold shadow-sm hover:bg-emerald-800 min-[380px]:w-auto min-[380px]:max-w-none min-[420px]:px-7 sm:h-12"
              >
                <TrackedAnchor
                  href="/signup"
                  analyticsEvent="marketing_cta_clicked"
                  analyticsProperties={{ source: "landing_hero", target: "signup" }}
                >
                  Começar grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </TrackedAnchor>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="marketing-button h-11 w-full max-w-[17rem] rounded-full border-white/25 bg-black/35 px-4 text-sm font-bold text-white shadow-sm backdrop-blur-sm hover:border-emerald-300/60 hover:bg-white/10 hover:text-white min-[380px]:w-auto min-[380px]:max-w-none min-[420px]:px-6 sm:h-12"
              >
                <TrackedAnchor
                  href="/precos"
                  analyticsEvent="marketing_cta_clicked"
                  analyticsProperties={{ source: "landing_hero", target: "pricing" }}
                >
                  Ver planos e preços
                </TrackedAnchor>
              </Button>
            </div>

            <div className="landing-hero-enter mt-3 flex max-w-3xl flex-wrap justify-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-300 [--motion-delay:230ms] min-[360px]:gap-x-3 min-[360px]:gap-y-1.5 min-[360px]:text-xs sm:mt-4 sm:justify-start sm:gap-x-5 sm:text-sm">
              {["Grátis sem cartão", "Cliente aprova sem login", "Celular e computador"].map((fact) => (
                <span key={fact} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {fact}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-hero-product-preview landing-product-enter relative z-10 mt-3 w-full max-w-[15rem] self-center overflow-hidden rounded-lg border border-white/15 bg-black/70 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-sm [--motion-delay:280ms] min-[360px]:max-w-[17rem] sm:mt-4 sm:max-w-[26rem] sm:p-2 lg:max-w-[27rem] lg:self-start">
            <Image
              src="/dashboard-mockup.png"
              alt="Painel do Prumo com propostas, projetos e visão financeira"
              width={1024}
              height={561}
              priority
              fetchPriority="high"
              sizes="(max-width: 359px) 240px, (max-width: 639px) 272px, (max-width: 1023px) 416px, 432px"
              className="h-auto w-full rounded-md object-contain"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.6fr] lg:items-center">
            <div data-reveal="up">
              <p className="text-sm font-bold text-emerald-700">
                Feito para o seu jeito de trabalhar
              </p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-foreground md:text-4xl">
                Um fluxo, quatro perfis profissionais.
              </h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-muted-foreground md:text-base">
                Você escolhe o perfil no cadastro. O Prumo adapta linguagem,
                modelos iniciais e navegação sem alterar seus dados, permissões
                ou plano.
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="marketing-button mt-4 rounded-full bg-background"
              >
                <TrackedAnchor
                  href="/demo"
                  analyticsEvent="public_demo_cta_clicked"
                  analyticsProperties={{
                    source: "landing_profiles",
                    target: "public_demo",
                  }}
                >
                  <PlayCircle aria-hidden="true" className="h-4 w-4" />
                  Explorar demonstração
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </TrackedAnchor>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {professionalProfiles.map((profile, index) => (
                <div
                  key={profile.title}
                  data-reveal="scale"
                  style={{ "--reveal-delay": `${index * 55}ms` } as CSSProperties}
                  className="flex min-h-28 gap-3 rounded-lg border bg-muted/60 p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-card text-primary">
                    <profile.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span>
                    <strong className="block text-sm text-foreground">
                      {profile.title}
                    </strong>
                    <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                      {profile.text}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO BENTO GRID */}
      <section className="relative z-10 border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div data-reveal="up" className="mb-8 text-center md:mb-12">
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
              Do primeiro contato ao projeto entregue.
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-muted-foreground md:text-lg">
              Um processo profissional para vender, executar e receber com clareza.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 auto-rows-auto md:grid-cols-3 md:gap-5 md:auto-rows-[250px]">
            {/* Bento Item 1 - Grande */}
            <div data-reveal="scale" className="group relative overflow-hidden rounded-lg border bg-muted/60 p-4 shadow-sm transition-shadow hover:shadow-md md:col-span-2 md:row-span-2 md:p-8">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-emerald-800">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Propostas que apresentam bem o seu trabalho.</h3>
                  <p className="mt-3 max-w-md text-sm font-medium leading-6 text-muted-foreground md:text-base md:leading-relaxed">
                    Organize escopo, itens, valores e observações. Depois envie um
                    link limpo para o cliente revisar e decidir pelo celular.
                  </p>
                </div>
                
                {/* Mini-UI interativa */}
                <div className="mt-5 max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-md md:mt-7 md:flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                        PR
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Projeto de interiores</div>
                        <div className="text-[10px] text-slate-500 font-medium">Para: Maria Santos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total</div>
                      <div className="text-xl font-black text-emerald-800">R$ 14.500</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-600 font-medium">Briefing e layout</span>
                      <span className="text-xs font-semibold text-slate-900">R$ 4.200</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs text-slate-600 font-medium">Detalhamento executivo</span>
                      <span className="text-xs font-semibold text-slate-900">R$ 8.000</span>
                    </div>
                  </div>
                  <div className="mt-5 flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <span className="landing-status-pulse rounded-full">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-wide">Aprovado pelo cliente</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Item 2 */}
            <div data-reveal="scale" className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-4 pb-0 text-white shadow-md [--reveal-delay:70ms] md:p-6 md:pb-0">
              <div className="relative z-10">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
                  <LineChart className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Margem na mão</h3>
                <p className="mt-1 text-slate-400 text-sm font-medium leading-relaxed">
                  Compare valor contratado, recebimentos e custos de cada projeto ou obra.
                </p>
              </div>

              {/* Mini-UI Chart */}
              <div className="relative z-10 mt-auto translate-y-6 rounded-t-lg border border-b-0 border-slate-700/50 bg-slate-800 p-4 pb-2 shadow-lg transition-transform group-hover:translate-y-0">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Lucro Estimado</div>
                    <div className="text-2xl font-black text-emerald-400">28.5%</div>
                  </div>
                  <div className="h-5 px-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +4.2%
                  </div>
                </div>
                <div className="h-10 w-full flex items-end gap-1.5 opacity-90">
                  <div className="w-1/6 bg-slate-700 h-[30%] rounded-t-sm" />
                  <div className="w-1/6 bg-slate-700 h-[45%] rounded-t-sm" />
                  <div className="w-1/6 bg-emerald-500/60 h-[60%] rounded-t-sm" />
                  <div className="w-1/6 bg-slate-700 h-[50%] rounded-t-sm" />
                  <div className="w-1/6 bg-emerald-500/80 h-[80%] rounded-t-sm" />
                  <div className="w-1/6 bg-emerald-400 h-[100%] rounded-t-sm shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
                </div>
              </div>
            </div>

            {/* Bento Item 3 */}
            <div data-reveal="scale" className="group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-card p-4 pb-0 shadow-sm transition-shadow [--reveal-delay:140ms] hover:shadow-md md:p-6 md:pb-0">
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Aprovação mobile</h3>
                <p className="mt-2 text-muted-foreground text-sm font-medium leading-relaxed">
                  Seu cliente abre a proposta no celular, revisa e aprova sem precisar criar conta.
                </p>
              </div>
              
              <div className="mt-8 relative w-48 mx-auto h-[240px] -mb-20 bg-slate-900 rounded-t-[2rem] border-[6px] border-slate-800 border-b-0 shadow-2xl overflow-hidden group-hover:-translate-y-4 transition-transform duration-500">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-full z-10" />
                <div className="absolute inset-0 bg-white pt-10 px-4">
                  <div className="w-full h-24 bg-emerald-50 rounded-xl border border-emerald-100 p-3 flex flex-col justify-between shadow-inner">
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-16 bg-slate-200 rounded-full" />
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 tracking-tight">Proposta #042</div>
                    <div className="mt-2 flex h-6 w-full items-center justify-center rounded-md bg-emerald-700 shadow-sm">
                      <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">Aprovar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: COMO FUNCIONA (4 passos) */}
      <section className="relative z-10 bg-background py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal="up" className="mb-8 text-center md:mb-14">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-bold text-muted-foreground shadow-sm">
              <ArrowRight className="h-4 w-4 text-emerald-800" /> 4 passos para receber
            </div>
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
              Da proposta ao{" "}
              <span className="text-emerald-800">projeto e ao recebimento.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
            {workflow.map((step, i) => (
              <div
                key={step.title}
                data-reveal="scale"
                style={{ "--reveal-delay": `${i * 55}ms` } as CSSProperties}
                className="group relative rounded-lg border bg-card p-4 text-left shadow-sm md:border-0 md:bg-transparent md:p-0 md:text-center md:shadow-none"
              >
                {/* Connector line */}
                {i < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-slate-200 to-slate-100" />
                )}
                <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-lg border-2 bg-card shadow-sm md:mx-auto md:mb-6 md:h-20 md:w-20">
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground shadow-sm">{i + 1}</span>
                  <step.icon className="h-6 w-6 text-muted-foreground md:h-8 md:w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground md:mx-auto md:max-w-[220px]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO: O PRODUTO COMEÇA ONDE DÓI */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div data-reveal="up" className="mb-8 text-center md:mb-14">
          <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-foreground md:text-5xl md:leading-snug">
            O produto começa onde dói:
            <span className="block text-emerald-800">
              venda, execução e dinheiro.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-6">
            <Reason
              title="Menos proposta perdida no WhatsApp"
              text="O cliente recebe um link organizado, com PDF e decisão registrada. Você acompanha o que foi enviado sem depender da conversa."
              icon={<FileText className="h-5 w-5 text-emerald-800" />}
            />
            <Reason
              title="Projeto e execução no mesmo contexto"
              text="Etapas, registros, equipe e custos ficam ligados ao projeto ou à obra, sem misturar informações de clientes diferentes."
              icon={<HardHat className="h-5 w-5 text-emerald-800" />}
            />
            <Reason
              title="Cobrança e financeiro organizados"
              text="Use Pix direto com confirmação manual ou Asaas com baixa pelo provedor. Acompanhe entrada, saldo e custos no financeiro."
              icon={<LineChart className="h-5 w-5 text-emerald-800" />}
            />
          </div>

          <div data-reveal="scale" className="relative h-[300px] w-full perspective-1000 md:h-[500px]">
            <div className="absolute right-0 top-0 h-[75%] w-[90%] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
              <div className="h-8 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <Image src="/dashboard-mockup.png" alt="Painel financeiro do Prumo" width={1024} height={561} sizes="(max-width: 768px) 90vw, 540px" className="w-full h-full object-cover object-left-top select-none pointer-events-none opacity-95" draggable={false} />
            </div>

            <div className="absolute bottom-4 left-0 h-[80%] w-[65%] overflow-hidden rounded-lg border-2 border-white bg-white shadow-xl">
               <Image src="/quote-mockup.png" alt="Orçamento público do Prumo" width={923} height={717} sizes="(max-width: 768px) 65vw, 390px" className="w-full h-full object-cover object-top select-none pointer-events-none" draggable={false} />
            </div>

            <div className="absolute right-1 top-[58%] flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-white shadow-lg md:-right-8 md:top-[55%] md:p-4">
              <div className="landing-status-pulse flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Link da proposta</p>
                <p className="text-sm font-black text-emerald-400">Aprovado online</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: PROVA DO PRODUTO */}
      <section className="relative z-10 border-y bg-card py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal="up" className="mb-8 text-center md:mb-12">
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
              Um fluxo completo,{" "}
              <span className="text-emerald-800">sem promessas vazias.</span>
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-muted-foreground md:text-lg">O que você já consegue fazer no Prumo hoje.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {[
              { title: "Proposta rastreável", text: "Crie a proposta, gere o PDF, envie o link e acompanhe visualização, aprovação ou pedido de revisão." },
              { title: "Projeto ligado à venda", text: "Transforme o documento aprovado em projeto ou obra, mantendo cliente e valor vinculados." },
              { title: "Entregas versionadas", text: "Publique arquivos ou links, receba aprovação ou ajustes e preserve o histórico de cada versão." },
              { title: "Financeiro por projeto", text: "Organize entrada, saldo, custos e margem estimada sem misturar trabalhos diferentes." },
            ].map((item, i) => (
              <div
                key={item.title}
                data-reveal="scale"
                style={{ "--reveal-delay": `${i * 55}ms` } as CSSProperties}
                className="rounded-lg border bg-muted/60 p-5 shadow-sm md:p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  {i === 0 ? <FileText className="h-5 w-5" /> : i === 1 ? <HardHat className="h-5 w-5" /> : i === 2 ? <PackageCheck className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                </div>
                <h3 className="font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div data-reveal="up">
        <LandingFaq />
      </div>

      <section className="bg-slate-950 px-4 py-14 text-white md:py-20">
        <div data-reveal="up" className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-5 text-center md:gap-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Comece pequeno, mas com cara de produto sério.
          </h2>
          <p className="max-w-2xl text-base font-medium leading-7 text-slate-300 md:text-xl md:leading-relaxed">
            Comece com uma proposta clara, receba a decisão do cliente e leve o
            trabalho para um projeto organizado. Cobranças, custos e margem
            continuam no mesmo fluxo.
          </p>
          <Button
            asChild
            size="lg"
            className="marketing-button mt-2 h-12 w-full max-w-[19rem] rounded-full bg-white px-8 text-base font-black text-emerald-800 shadow-sm hover:bg-slate-100 md:mt-4 md:w-auto md:px-10"
          >
            <TrackedAnchor
              href="/signup"
              analyticsEvent="marketing_cta_clicked"
              analyticsProperties={{ source: "landing_final_cta", target: "signup" }}
            >
              Criar minha conta agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </TrackedAnchor>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card px-4 py-8">
        <div className="mx-auto max-w-6xl text-muted-foreground">
          <div className="flex flex-col gap-4 text-sm font-semibold md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Prumo. Todos os direitos reservados.</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/ajuda" className="transition-colors hover:text-emerald-800">
                Ajuda
              </Link>
              <Link href="/precos" className="transition-colors hover:text-emerald-800">
                Preços
              </Link>
              <Link href="/termos" className="transition-colors hover:text-emerald-800">
                Termos
              </Link>
              <Link href="/privacidade" className="transition-colors hover:text-emerald-800">
                Privacidade
              </Link>
            </div>
          </div>
          {legalIdentity ? (
            <p className="mt-4 border-t pt-4 text-xs font-medium leading-5">
              Operado por {legalIdentity.legalName} ·{" "}
              {legalIdentity.documentType} {legalIdentity.formattedDocument}
              <span className="block">{legalIdentity.legalAddress}</span>
            </p>
          ) : null}
        </div>
      </footer>
      </MarketingMotion>
    </main>
  );
}

function Reason({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <div data-reveal="up" className="group relative overflow-hidden rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="absolute inset-y-0 left-0 w-1 bg-emerald-700" />
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <p className="mt-3 leading-relaxed text-muted-foreground font-medium">{text}</p>
        </div>
      </div>
    </div>
  );
}
