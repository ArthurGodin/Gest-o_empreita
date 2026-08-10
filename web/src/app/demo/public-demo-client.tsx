"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  FileText,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  PackageCheck,
  Palette,
  Ruler,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { TrackedAnchor } from "@/components/tracked-anchor";
import { ThemeIconButton } from "@/components/theme-control";
import { Button } from "@/components/ui/button";
import { buildAcquisitionHref } from "@/lib/acquisition-context";
import {
  BUSINESS_SEGMENT_OPTIONS,
  type BusinessSegment,
} from "@/lib/business-segment";
import {
  getPublicDemoScenario,
  type PublicDemoScenario,
  type PublicDemoSectionId,
} from "@/lib/public-demo";
import { trackProductEvent } from "@/lib/product-analytics";
import { cn } from "@/lib/utils";
import { DemoDeliverables } from "./demo-deliverables";
import { DemoFinance } from "./demo-finance";
import { DemoOverview } from "./demo-overview";
import { DemoProject } from "./demo-project";
import { DemoQuote } from "./demo-quote";

interface DemoSectionOption {
  id: PublicDemoSectionId;
  label: string;
  icon: typeof HardHat;
}

const SECTION_OPTIONS: readonly DemoSectionOption[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "quote", label: "Proposta", icon: FileText },
  { id: "project", label: "Projeto", icon: FolderKanban },
  { id: "deliverables", label: "Entregas", icon: PackageCheck },
  { id: "finance", label: "Financeiro", icon: WalletCards },
];

const PROFILE_ICONS: Record<BusinessSegment, typeof HardHat> = {
  architecture: Ruler,
  interiors: Palette,
  engineering: Building2,
  construction: HardHat,
};

export function PublicDemoClient() {
  const [segment, setSegment] = useState<BusinessSegment>("architecture");
  const [section, setSection] = useState<PublicDemoSectionId>("overview");
  const scenario = getPublicDemoScenario(segment);
  const signupHref = buildAcquisitionHref("/signup", {
    businessSegment: segment,
  });
  const pricingHref = buildAcquisitionHref("/precos", {
    businessSegment: segment,
  });

  useEffect(() => {
    trackProductEvent("public_demo_opened", {
      profile: "architecture",
      section: "overview",
    });
  }, []);

  function selectSegment(nextSegment: BusinessSegment) {
    setSegment(nextSegment);
    setSection("overview");
    trackProductEvent("public_demo_profile_changed", {
      profile: nextSegment,
    });
    trackProductEvent("public_demo_section_viewed", {
      profile: nextSegment,
      section: "overview",
    });
  }

  function selectSection(nextSection: PublicDemoSectionId) {
    setSection(nextSection);
    trackProductEvent("public_demo_section_viewed", {
      profile: segment,
      section: nextSection,
    });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DemoHeader segment={segment} />

      <main>
        <section className="border-b bg-card">
          <div className="mx-auto max-w-[1184px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  Ambiente público protegido
                </p>
                <h1 className="mt-2 max-w-3xl text-[1.7rem] font-bold leading-9 sm:text-3xl">
                  Veja o fluxo do Prumo por dentro.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Explore um trabalho fictício do primeiro escopo até entregas e
                  resultado financeiro. Nada é salvo ou cobrado.
                </p>
              </div>

              <div className="min-w-0 lg:w-[27rem] lg:shrink-0">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Escolha seu perfil
                </p>
                <div
                  role="group"
                  aria-label="Perfil da demonstração"
                  className="grid grid-cols-2 gap-2"
                >
                  {BUSINESS_SEGMENT_OPTIONS.map((option) => {
                    const Icon = PROFILE_ICONS[option.value];
                    const active = segment === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectSegment(option.value)}
                        className={cn(
                          "inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold outline-none transition-[background-color,border-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground",
                        )}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4" />
                        {option.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1184px] py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="border-y bg-card sm:overflow-hidden sm:rounded-lg sm:border">
            <div className="flex min-w-0 flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-bold text-foreground">
                    {scenario.organizationName}
                  </p>
                  <span className="shrink-0 rounded border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    Demo
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {scenario.organizationLabel} · {scenario.customerLabel}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Cenário fictício e somente leitura
              </div>
            </div>

            <DemoMobileNavigation
              scenario={scenario}
              activeSection={section}
              onSelect={selectSection}
            />

            <div className="grid min-w-0 md:grid-cols-[13.5rem_minmax(0,1fr)]">
              <DemoDesktopNavigation
                scenario={scenario}
                activeSection={section}
                onSelect={selectSection}
              />
              <div
                key={`${segment}-${section}`}
                className="min-w-0 animate-in fade-in slide-in-from-bottom-2 p-4 duration-300 motion-reduce:animate-none sm:p-5 lg:p-6"
              >
                <DemoSectionContent section={section} scenario={scenario} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 bg-[#07100c] px-4 py-10 text-white sm:py-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase text-emerald-300">
              O próximo projeto pode ser real
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-8 sm:text-3xl">
              Organize a primeira proposta no seu próprio espaço.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Comece no plano grátis, sem cartão. Seus dados ficam separados
              deste cenário público.
            </p>
            <div className="mt-5 flex w-full flex-col justify-center gap-2 min-[420px]:w-auto min-[420px]:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full rounded-full min-[420px]:w-auto"
              >
                <TrackedAnchor
                  href={signupHref}
                  analyticsEvent="public_demo_cta_clicked"
                  analyticsProperties={{
                    source: "public_demo_final",
                    target: "signup",
                    profile: segment,
                  }}
                >
                  Criar conta grátis
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </TrackedAnchor>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white min-[420px]:w-auto"
              >
                <TrackedAnchor
                  href={pricingHref}
                  analyticsEvent="public_demo_cta_clicked"
                  analyticsProperties={{
                    source: "public_demo_final",
                    target: "pricing",
                    profile: segment,
                  }}
                >
                  Ver planos
                </TrackedAnchor>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function DemoHeader({ segment }: { segment: BusinessSegment }) {
  const signupHref = buildAcquisitionHref("/signup", {
    businessSegment: segment,
  });
  const pricingHref = buildAcquisitionHref("/precos", {
    businessSegment: segment,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07100c]/95 text-white shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1184px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="truncate text-base font-bold sm:text-lg">Prumo</span>
        </Link>

        <span className="hidden items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 min-[560px]:inline-flex">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          Demonstração protegida
        </span>

        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden rounded-full text-white hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <TrackedAnchor
              href={pricingHref}
              analyticsEvent="public_demo_cta_clicked"
              analyticsProperties={{
                source: "public_demo_header",
                target: "pricing",
                profile: segment,
              }}
            >
              Planos
            </TrackedAnchor>
          </Button>
          <ThemeIconButton className="h-10 w-10 rounded-full border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white" />
          <Button asChild size="sm" className="rounded-full px-3 sm:px-4">
            <TrackedAnchor
              href={signupHref}
              analyticsEvent="public_demo_cta_clicked"
              analyticsProperties={{
                source: "public_demo_header",
                target: "signup",
                profile: segment,
              }}
            >
              <span className="hidden min-[390px]:inline">Criar conta</span>
              <span className="min-[390px]:hidden">Criar</span>
            </TrackedAnchor>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function DemoMobileNavigation({
  scenario,
  activeSection,
  onSelect,
}: DemoNavigationProps) {
  return (
    <nav
      aria-label="Áreas da demonstração"
      className="border-b px-4 py-2 md:hidden"
    >
      <div className="grid grid-cols-5">
        {SECTION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = activeSection === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option.id)}
              className={cn(
                "inline-flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 border-b-2 px-1 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span className="max-w-full truncate">
                {sectionLabel(option.id, option.label, scenario)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function DemoDesktopNavigation({
  scenario,
  activeSection,
  onSelect,
}: DemoNavigationProps) {
  return (
    <aside className="hidden border-r bg-muted/20 p-3 md:block">
      <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase text-muted-foreground">
        Roteiro
      </p>
      <nav aria-label="Áreas da demonstração" className="space-y-1">
        {SECTION_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          const active = activeSection === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option.id)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs",
                  active
                    ? "border-white/20 bg-white/10"
                    : "border-border bg-card",
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {sectionLabel(option.id, option.label, scenario)}
              </span>
              <span className={cn("text-[10px]", active ? "text-white/70" : "text-muted-foreground")}>
                {index + 1}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 border-t px-2 pt-4">
        <p className="text-xs font-semibold text-foreground">
          Somente leitura
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Nenhuma ação desta rota alcança dados ou pagamentos reais.
        </p>
      </div>
    </aside>
  );
}

interface DemoNavigationProps {
  scenario: PublicDemoScenario;
  activeSection: PublicDemoSectionId;
  onSelect: (section: PublicDemoSectionId) => void;
}

function sectionLabel(
  section: PublicDemoSectionId,
  fallback: string,
  scenario: PublicDemoScenario,
) {
  if (section === "quote") return scenario.quoteLabel;
  if (section === "project") return scenario.projectLabel;
  return fallback;
}

function DemoSectionContent({
  section,
  scenario,
}: {
  section: PublicDemoSectionId;
  scenario: PublicDemoScenario;
}) {
  if (section === "quote") return <DemoQuote scenario={scenario} />;
  if (section === "project") return <DemoProject scenario={scenario} />;
  if (section === "deliverables") {
    return <DemoDeliverables scenario={scenario} />;
  }
  if (section === "finance") return <DemoFinance scenario={scenario} />;
  return <DemoOverview scenario={scenario} />;
}
