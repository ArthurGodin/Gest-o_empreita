"use client";

import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { PROJECT_STATUS_LABEL } from "@/lib/project-status";
import { formatDateBR } from "@/lib/utils";
import type { ProjectListItem } from "@/lib/queries/projects";
import { StatusMenu } from "./status-menu";

const STATUS_PILL: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  in_progress:
    "bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  paused:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  completed:
    "bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
};

export function ProjectHeader({ project }: { project: ProjectListItem }) {
  const startedFmt = project.starts_on
    ? formatDateBR(project.starts_on)
    : null;
  const pillClass = STATUS_PILL[project.status] ?? STATUS_PILL.planning;

  return (
    <div className="space-y-3">
      <Link
        href="/app/obras"
        className="-ml-2 inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Voltar para obras
      </Link>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-bold text-foreground text-balance sm:text-2xl">
            {project.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {project.address && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {project.address}
              </span>
            )}
            {project.customer && (
              <span>Cliente: {project.customer.name}</span>
            )}
            {startedFmt && <span>Iniciada {startedFmt}</span>}
            <span
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${pillClass}`}
            >
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
          </div>
        </div>
        <div className="shrink-0 self-stretch sm:self-auto">
          <StatusMenu projectId={project.id} current={project.status} />
        </div>
      </div>
    </div>
  );
}
