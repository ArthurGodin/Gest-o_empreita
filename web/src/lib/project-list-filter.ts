import { normalizeSearch } from "@/lib/search";
import type { ProjectStatus } from "@/lib/supabase/types";

export type ProjectListStatusFilter = "all" | ProjectStatus;

export const PROJECT_LIST_STATUS_FILTERS: ReadonlyArray<{
  value: ProjectListStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "planning", label: "Planejadas" },
  { value: "in_progress", label: "Em execu\u00e7\u00e3o" },
  { value: "paused", label: "Pausadas" },
  { value: "completed", label: "Conclu\u00eddas" },
  { value: "cancelled", label: "Canceladas" },
];

const STATUS_FILTER_VALUES = new Set<ProjectListStatusFilter>(
  PROJECT_LIST_STATUS_FILTERS.map((filter) => filter.value),
);

export interface ProjectListFilterItem {
  name: string;
  status: ProjectStatus;
  customer?: { name: string } | null;
}

export function parseProjectListStatusFilter(
  value: string | null | undefined,
): ProjectListStatusFilter {
  return value && STATUS_FILTER_VALUES.has(value as ProjectListStatusFilter)
    ? (value as ProjectListStatusFilter)
    : "all";
}

export function filterProjects<T extends ProjectListFilterItem>(
  projects: T[],
  filters: { query: string; status: ProjectListStatusFilter },
): T[] {
  const query = normalizeSearch(filters.query);

  return projects.filter((project) => {
    if (filters.status !== "all" && project.status !== filters.status) {
      return false;
    }
    if (!query) return true;

    return (
      normalizeSearch(project.name).includes(query) ||
      normalizeSearch(project.customer?.name ?? "").includes(query)
    );
  });
}

export function countProjectsByStatus<T extends ProjectListFilterItem>(
  projects: T[],
): Record<ProjectListStatusFilter, number> {
  const counts = Object.fromEntries(
    PROJECT_LIST_STATUS_FILTERS.map((filter) => [filter.value, 0]),
  ) as Record<ProjectListStatusFilter, number>;

  counts.all = projects.length;
  for (const project of projects) counts[project.status] += 1;

  return counts;
}
