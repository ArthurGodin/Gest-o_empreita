import type { ActivationGoal } from "@/lib/activation-goals";

export function directProjectDestination(
  projectId: string,
  goal: ActivationGoal,
): string {
  const base = `/app/obras/${projectId}`;
  switch (goal) {
    case "client_briefing":
      return `${base}?view=briefing`;
    case "deliverables":
      return `${base}?view=entregas`;
    case "execution_control":
      return `${base}?view=gestao#custos`;
    default:
      return `${base}?view=etapas`;
  }
}
