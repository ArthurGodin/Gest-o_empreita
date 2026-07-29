"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { requestProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { cn } from "@/lib/utils";
import type { BusinessSegment } from "@/lib/business-segment";
import { trackProductEvent } from "@/lib/product-analytics";
import {
  buildProjectWorkspaceHref,
  resolveLegacyProjectWorkspaceHash,
  type ProjectWorkspaceView,
  type ProjectWorkspaceViewOption,
} from "./project-workspace";

interface ProjectWorkspaceNavProps {
  activeView: ProjectWorkspaceView;
  segment: BusinessSegment;
  views: readonly ProjectWorkspaceViewOption[];
}

export function ProjectWorkspaceNav({
  activeView,
  segment,
  views,
}: ProjectWorkspaceNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousViewRef = useRef(activeView);
  const focusAfterNavigationRef = useRef(false);
  const currentSearch = searchParams.toString();

  const hrefFor = useCallback(
    (view: ProjectWorkspaceView, hash?: string) =>
      buildProjectWorkspaceHref({
        pathname,
        currentSearch,
        view,
        hash,
      }),
    [currentSearch, pathname],
  );

  const trackViewChange = useCallback(
    (view: ProjectWorkspaceView, source: "desktop_tabs" | "mobile_select") => {
      trackProductEvent("project_workspace_view_changed", {
        segment,
        source,
        view,
      });
    },
    [segment],
  );

  useEffect(() => {
    const target = resolveLegacyProjectWorkspaceHash(
      window.location.hash,
      segment,
    );
    if (!target) return;

    if (target.view !== activeView) {
      router.replace(hrefFor(target.view, target.hash), { scroll: false });
      return;
    }

    if (target.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(target.hash!)?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      });
      return;
    }

    window.history.replaceState(null, "", hrefFor(target.view));
  }, [activeView, hrefFor, router, segment]);

  useEffect(() => {
    if (previousViewRef.current === activeView) return;
    previousViewRef.current = activeView;
    if (!focusAfterNavigationRef.current) return;
    focusAfterNavigationRef.current = false;

    window.requestAnimationFrame(() => {
      document.getElementById("project-workspace-view")?.focus({
        preventScroll: true,
      });
    });
  }, [activeView]);

  return (
    <nav
      aria-label="Áreas do projeto"
      className="-mx-4 border-y bg-background/95 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur sm:-mx-6 lg:sticky lg:top-3 lg:z-30 lg:mx-0 lg:rounded-lg lg:border"
    >
      <div className="px-4 sm:px-6 lg:px-2">
        <label className="block lg:hidden">
          <span className="sr-only">Área do projeto</span>
          <select
            name="project-workspace-view"
            value={activeView}
            onChange={(event) => {
              const view = event.target.value as ProjectWorkspaceView;
              const href = hrefFor(view);
              if (!requestProtectedFormNavigation(href)) {
                event.currentTarget.value = activeView;
                return;
              }
              focusAfterNavigationRef.current = true;
              trackViewChange(view, "mobile_select");
              router.push(href, { scroll: false });
            }}
            className="h-11 w-full touch-manipulation rounded-md border border-input bg-card px-3 text-base font-medium text-slate-800 outline-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.label}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden min-h-11 items-center gap-1 lg:flex">
          {views.map((view) => {
            const active = activeView === view.id;
            return (
              <Link
                key={view.id}
                href={hrefFor(view.id)}
                scroll={false}
                onClick={() => trackViewChange(view.id, "desktop_tabs")}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 touch-manipulation items-center rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary/10 text-emerald-900"
                    : "text-muted-foreground hover:bg-slate-100 hover:text-foreground",
                )}
              >
                {view.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
