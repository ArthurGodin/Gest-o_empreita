import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { PROJECT_STATUS_LABEL } from "@/lib/project-status";
import { formatDateBR } from "@/lib/utils";
import type { ProjectListItem } from "@/lib/queries/projects";

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
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para obras
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {project.name}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {project.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {project.address}
            </span>
          )}
          {project.customer && (
            <span>Cliente: {project.customer.name}</span>
          )}
          {startedFmt && <span>Iniciada {startedFmt}</span>}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pillClass}`}
          >
            {PROJECT_STATUS_LABEL[project.status]}
          </span>
        </div>
      </div>
    </div>
  );
}
