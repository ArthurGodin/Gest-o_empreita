import type { BusinessSegment } from "@/lib/business-segment";

export const PROJECT_WORKSPACE_VIEW_IDS = [
  "resumo",
  "briefing",
  "ambientes",
  "etapas",
  "entregas",
  "gestao",
] as const;

export type ProjectWorkspaceView =
  (typeof PROJECT_WORKSPACE_VIEW_IDS)[number];

export interface ProjectWorkspaceViewOption {
  id: ProjectWorkspaceView;
  label: string;
}

export interface LegacyProjectWorkspaceTarget {
  view: ProjectWorkspaceView;
  hash?: string;
}

const PROJECT_WORKSPACE_VIEW_OPTIONS: Record<
  ProjectWorkspaceView,
  ProjectWorkspaceViewOption
> = {
  resumo: { id: "resumo", label: "Resumo" },
  briefing: { id: "briefing", label: "Briefing" },
  ambientes: { id: "ambientes", label: "Ambientes" },
  etapas: { id: "etapas", label: "Etapas" },
  entregas: { id: "entregas", label: "Entregas" },
  gestao: { id: "gestao", label: "Gestão" },
};

const PROFESSIONAL_VIEWS: readonly ProjectWorkspaceView[] = [
  "resumo",
  "briefing",
  "ambientes",
  "etapas",
  "entregas",
  "gestao",
];

const GENERAL_VIEWS: readonly ProjectWorkspaceView[] = [
  "resumo",
  "etapas",
  "entregas",
  "gestao",
];

const LEGACY_HASH_TARGETS: Readonly<
  Record<string, LegacyProjectWorkspaceTarget>
> = {
  resumo: { view: "resumo" },
  briefing: { view: "briefing" },
  ambientes: { view: "ambientes" },
  etapas: { view: "etapas" },
  entregas: { view: "entregas" },
  gestao: { view: "gestao" },
  cobranca: { view: "gestao", hash: "cobranca" },
  diario: { view: "gestao", hash: "diario" },
  custos: { view: "gestao", hash: "custos" },
  equipe: { view: "gestao", hash: "equipe" },
};

export function hasProfessionalProjectTools(segment: BusinessSegment) {
  return segment === "architecture" || segment === "interiors";
}

export function getProjectWorkspaceViews(
  segment: BusinessSegment,
): readonly ProjectWorkspaceViewOption[] {
  const views = hasProfessionalProjectTools(segment)
    ? PROFESSIONAL_VIEWS
    : GENERAL_VIEWS;
  return views.map((view) => PROJECT_WORKSPACE_VIEW_OPTIONS[view]);
}

export function isProjectWorkspaceView(
  value: unknown,
): value is ProjectWorkspaceView {
  return (
    typeof value === "string" &&
    PROJECT_WORKSPACE_VIEW_IDS.includes(value as ProjectWorkspaceView)
  );
}

export function isProjectWorkspaceViewAvailable(
  value: unknown,
  segment: BusinessSegment,
): value is ProjectWorkspaceView {
  if (!isProjectWorkspaceView(value)) return false;
  return getProjectWorkspaceViews(segment).some((view) => view.id === value);
}

export function resolveProjectWorkspaceView({
  value,
  segment,
  billingAttention = false,
}: {
  value: unknown;
  segment: BusinessSegment;
  billingAttention?: boolean;
}): ProjectWorkspaceView {
  if (isProjectWorkspaceViewAvailable(value, segment)) return value;
  if ((value == null || value === "") && billingAttention) return "gestao";
  return "resumo";
}

export function resolveLegacyProjectWorkspaceHash(
  hash: string,
  segment: BusinessSegment,
): LegacyProjectWorkspaceTarget | null {
  const normalizedHash = decodeURIComponent(hash)
    .replace(/^#/, "")
    .trim()
    .toLowerCase();
  const target = LEGACY_HASH_TARGETS[normalizedHash];
  if (!target) return null;
  if (!isProjectWorkspaceViewAvailable(target.view, segment)) return null;
  return target;
}

export function buildProjectWorkspaceHref({
  pathname,
  currentSearch,
  view,
  hash,
}: {
  pathname: string;
  currentSearch?: string | URLSearchParams;
  view: ProjectWorkspaceView;
  hash?: string;
}): string {
  const params = new URLSearchParams(
    typeof currentSearch === "string"
      ? currentSearch.replace(/^\?/, "")
      : currentSearch,
  );

  params.set("view", view);
  if (view !== "gestao") params.delete("cobranca");

  const query = params.toString();
  const normalizedHash = hash
    ? `#${encodeURIComponent(hash.replace(/^#/, ""))}`
    : "";

  return `${pathname}${query ? `?${query}` : ""}${normalizedHash}`;
}
