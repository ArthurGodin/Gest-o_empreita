"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ListEmptyState,
  ListStatusFilter,
  ListToolbar,
} from "@/components/app-shell/list-toolbar";
import {
  countProjectsByStatus,
  filterProjects,
  parseProjectListStatusFilter,
  PROJECT_LIST_STATUS_FILTERS,
  type ProjectListStatusFilter,
} from "@/lib/project-list-filter";
import type { ProjectListItem } from "@/lib/queries/projects";
import type { ProjectStatus } from "@/lib/supabase/types";
import { formatBRL, formatDateBR } from "@/lib/utils";
import {
  useBusinessSegment,
  useBusinessVocabulary,
} from "@/components/business-segment-context";

const CONSTRUCTION_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejada",
  in_progress: "Em execu\u00e7\u00e3o",
  paused: "Pausada",
  completed: "Conclu\u00edda",
  cancelled: "Cancelada",
};

const PROFESSIONAL_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejado",
  in_progress: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const PROFESSIONAL_STATUS_FILTERS: typeof PROJECT_LIST_STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "planning", label: "Planejados" },
  { value: "in_progress", label: "Em andamento" },
  { value: "paused", label: "Pausados" },
  { value: "completed", label: "Concluídos" },
  { value: "cancelled", label: "Cancelados" },
];

const STATUS_CLASS: Record<ProjectStatus, string> = {
  planning: "bg-sky-100 text-sky-800",
  in_progress: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  const segment = useBusinessSegment();
  const vocabulary = useBusinessVocabulary();
  const statusFilters =
    segment === "construction"
      ? PROJECT_LIST_STATUS_FILTERS
      : PROFESSIONAL_STATUS_FILTERS;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<ProjectListStatusFilter>(() =>
    parseProjectListStatusFilter(searchParams.get("status")),
  );

  const counts = useMemo(() => countProjectsByStatus(projects), [projects]);
  const filtered = useMemo(
    () => filterProjects(projects, { query, status: statusFilter }),
    [projects, query, statusFilter],
  );
  const hasActiveFilters = statusFilter !== "all" || query.trim().length > 0;
  const activeStatusLabel =
    statusFilters.find(
      (filter) => filter.value === statusFilter,
    )?.label ?? (segment === "construction" ? "Todas" : "Todos");
  const summary = !hasActiveFilters
    ? `${projects.length} ${
        projects.length === 1
          ? vocabulary.projectSingular.toLocaleLowerCase("pt-BR")
          : vocabulary.projectPluralLower
      }`
    : statusFilter === "all"
      ? `${filtered.length} de ${projects.length} ${vocabulary.projectPluralLower}`
      : `${filtered.length} de ${projects.length} em ${activeStatusLabel.toLocaleLowerCase("pt-BR")}`;
  const emptyDescription =
    statusFilter === "all"
      ? `Não encontramos ${vocabulary.projectSingular.toLocaleLowerCase("pt-BR")} para “${query.trim()}”.`
      : `Não há ${vocabulary.projectSingular.toLocaleLowerCase("pt-BR")} em ${activeStatusLabel.toLocaleLowerCase("pt-BR")}${
          query.trim() ? ` com \u201c${query.trim()}\u201d.` : "."
        }`;

  function updateUrl(next: {
    query?: string;
    status?: ProjectListStatusFilter;
  }) {
    const nextQuery = next.query ?? query;
    const nextStatus = next.status ?? statusFilter;
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    else params.delete("q");

    if (nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");

    const href = params.toString() ? `${pathname}?${params}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function onQueryChange(value: string) {
    setQuery(value);
    updateUrl({ query: value });
  }

  function onStatusChange(value: ProjectListStatusFilter) {
    setStatusFilter(value);
    updateUrl({ status: value });
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    updateUrl({ query: "", status: "all" });
  }

  return (
    <div className="space-y-3">
      <ListToolbar
        ariaLabel={`Busca e filtros de ${vocabulary.projectPluralLower}`}
        search={{
          value: query,
          onValueChange: onQueryChange,
          name: "project-search",
          label: `Buscar ${vocabulary.projectPluralLower}`,
          placeholder: `Buscar por ${vocabulary.projectSingular.toLocaleLowerCase("pt-BR")} ou cliente…`,
        }}
        filters={
          <ListStatusFilter
            label={`Filtrar ${vocabulary.projectPluralLower} por status`}
            value={statusFilter}
            options={statusFilters}
            counts={counts}
            onValueChange={onStatusChange}
          />
        }
        summary={
          <p>
            {summary}
            {isPending ? " \u00b7 atualizando\u2026" : ""}
          </p>
        }
        clearAll={
          hasActiveFilters
            ? { label: "Limpar filtros", onClick: clearFilters }
            : undefined
        }
      />

      {filtered.length === 0 ? (
        <ListEmptyState
          title={
            segment === "construction"
              ? "Nenhuma obra encontrada"
              : "Nenhum projeto encontrado"
          }
          description={emptyDescription}
          actionLabel={`Ver ${
            segment === "construction" ? "todas as" : "todos os"
          } ${vocabulary.projectPluralLower}`}
          onAction={clearFilters}
        />
      ) : (
        <section
          aria-label={`Lista de ${vocabulary.projectPluralLower}`}
          className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
        >
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_7.5rem_7.5rem_9rem] gap-4 border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
            <span>{vocabulary.projectSingular}</span>
            <span>Cliente</span>
            <span>Status</span>
            <span>In\u00edcio</span>
            <span className="text-right">Or\u00e7amento</span>
          </div>
          <ul className="divide-y">
            {filtered.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  const segment = useBusinessSegment();
  const vocabulary = useBusinessVocabulary();

  return (
    <li>
      <Link
        href={`/app/obras/${project.id}`}
        aria-label={`Abrir ${vocabulary.projectSingular.toLocaleLowerCase("pt-BR")} ${project.name}`}
        className="grid min-h-[92px] grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-16 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_7.5rem_7.5rem_9rem] md:items-center md:gap-4 md:py-3"
      >
        <span className="col-span-2 min-w-0 md:col-span-1">
          <span
            title={project.name}
            className="block truncate text-sm font-semibold text-slate-950"
          >
            {project.name}
          </span>
        </span>
        <span
          title={project.customer?.name ?? "Sem cliente"}
          className="min-w-0 truncate text-sm text-slate-600"
        >
          {project.customer?.name ?? "Sem cliente"}
        </span>
        <span className="justify-self-end md:col-start-3 md:row-start-1 md:justify-self-start">
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_CLASS[project.status]}`}
          >
            {segment === "construction"
              ? CONSTRUCTION_STATUS_LABEL[project.status]
              : PROFESSIONAL_STATUS_LABEL[project.status]}
          </span>
        </span>
        <span className="text-xs text-muted-foreground md:col-start-4 md:row-start-1">
          {project.starts_on ? formatDateBR(project.starts_on) : "Sem data"}
        </span>
        <span className="justify-self-end self-end text-base font-bold tabular-nums text-primary md:col-start-5 md:row-start-1 md:self-auto md:text-right">
          {project.budget_cents == null
            ? "Sem valor"
            : formatBRL(project.budget_cents / 100)}
        </span>
      </Link>
    </li>
  );
}
