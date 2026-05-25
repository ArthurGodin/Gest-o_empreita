import type { ProjectStatus, StageStatus } from "@/lib/supabase/types";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  planning: ["in_progress", "cancelled"],
  in_progress: ["paused", "completed", "cancelled"],
  paused: ["in_progress", "cancelled"],
  completed: [], // terminal
  cancelled: ["planning"], // reabrir é raro mas permitido com confirm
};

export function canTransitionStatus(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export type StatusSuggestion =
  | {
      kind: "start";
      to: "in_progress";
      reason: "Primeira etapa entrou em execução";
    }
  | {
      kind: "complete";
      to: "completed";
      reason: "Todas as etapas estão concluídas";
    };

/**
 * Sugere transição com base no estado atual das etapas.
 * Retorna null se nenhuma sugestão se aplica.
 */
export function suggestNextStatus(
  status: ProjectStatus,
  stages: { status: StageStatus }[],
): StatusSuggestion | null {
  if (stages.length === 0) return null;

  if (status === "planning") {
    const anyInProgress = stages.some((s) => s.status === "in_progress");
    if (anyInProgress) {
      return {
        kind: "start",
        to: "in_progress",
        reason: "Primeira etapa entrou em execução",
      };
    }
  }

  if (status === "in_progress") {
    const allDone = stages.every((s) => s.status === "done");
    if (allDone) {
      return {
        kind: "complete",
        to: "completed",
        reason: "Todas as etapas estão concluídas",
      };
    }
  }

  return null;
}
