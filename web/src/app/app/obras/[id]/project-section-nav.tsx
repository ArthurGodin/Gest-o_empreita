"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { useBusinessVocabulary } from "@/components/business-segment-context";

const PROJECT_SECTIONS = [
  { id: "etapas", label: "Etapas" },
  { id: "cobranca", label: "Cobran\u00e7a" },
  { id: "diario", label: "Di\u00e1rio" },
  { id: "custos", label: "Custos" },
  { id: "equipe", label: "Equipe" },
] as const;

type ProjectSectionId = (typeof PROJECT_SECTIONS)[number]["id"];

const SECTION_IDS = new Set<ProjectSectionId>(
  PROJECT_SECTIONS.map((section) => section.id),
);

function sectionFromHash(hash: string): ProjectSectionId | null {
  const value = decodeURIComponent(hash.replace(/^#/, ""));
  return SECTION_IDS.has(value as ProjectSectionId)
    ? (value as ProjectSectionId)
    : null;
}

export function ProjectSectionNav() {
  const vocabulary = useBusinessVocabulary();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] =
    useState<ProjectSectionId>("etapas");
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    function syncFromLocation(scroll: boolean) {
      const section = sectionFromHash(window.location.hash);
      if (!section) return;

      setActiveSection(section);
      if (scroll) {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(section);
          target?.scrollIntoView({
            behavior: "auto",
            block: "start",
          });
          target?.focus({ preventScroll: true });
        });
      }
    }

    syncFromLocation(Boolean(window.location.hash));
    const onHistoryChange = () => syncFromLocation(true);
    window.addEventListener("hashchange", onHistoryChange);
    window.addEventListener("popstate", onHistoryChange);

    return () => {
      window.removeEventListener("hashchange", onHistoryChange);
      window.removeEventListener("popstate", onHistoryChange);
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    function updateFloatingState() {
      frame = 0;
      const sentinel = sentinelRef.current;
      if (!sentinel) return;

      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const topbar = desktop
        ? null
        : document.querySelector<HTMLElement>("header");
      const topOffset = desktop
        ? 12
        : (topbar?.getBoundingClientRect().bottom ?? 56);
      const nextFloating = sentinel.getBoundingClientRect().top <= topOffset;
      setFloating((current) =>
        current === nextFloating ? current : nextFloating,
      );
    }

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateFloatingState);
    }

    updateFloatingState();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function navigate(section: ProjectSectionId) {
    const target = document.getElementById(section);
    if (!target) return;

    setActiveSection(section);
    if (sectionFromHash(window.location.hash) !== section) {
      window.history.pushState(null, "", `#${section}`);
    }
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
  }

  function onLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    section: ProjectSectionId,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(section);
  }

  return (
    <div ref={sentinelRef} className="relative">
      {floating ? <div aria-hidden="true" className="h-[61px]" /> : null}
      <nav
        aria-label={`Seções ${vocabulary.projectSingular === "Projeto" ? "do projeto" : "da obra"}`}
        className={cn(
          "z-30 border-y bg-background/95 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur",
          floating
            ? "fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] lg:left-56 lg:top-3"
            : "-mx-4 sm:-mx-6 lg:mx-0 lg:rounded-lg lg:border",
        )}
      >
        <div
          className={cn(
            floating
              ? "mx-auto w-full max-w-[1184px] px-4 sm:px-6 lg:px-8"
              : "px-4 sm:px-6 lg:px-2",
          )}
        >
          <label className="block lg:hidden">
            <span className="sr-only">
              {`Ir para uma seção ${vocabulary.projectSingular === "Projeto" ? "do projeto" : "da obra"}`}
            </span>
            <select
              name="project-section"
              value={activeSection}
              onChange={(event) =>
                navigate(event.target.value as ProjectSectionId)
              }
              className="h-11 w-full touch-manipulation rounded-md border border-input bg-card px-3 text-base text-slate-800 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              {PROJECT_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  Ir para: {section.label}
                </option>
              ))}
            </select>
          </label>

          <div className="hidden items-center gap-1 lg:flex">
            {PROJECT_SECTIONS.map((section) => {
              const active = activeSection === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={active ? "location" : undefined}
                  onClick={(event) => onLinkClick(event, section.id)}
                  className={cn(
                    "inline-flex h-11 touch-manipulation items-center rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/10 text-emerald-900"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground",
                  )}
                >
                  {section.label}
                </a>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
