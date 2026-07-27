import type { AppPlan } from "@/lib/plans";

export interface ArchitecturePlanLimits {
  activeBriefingsPerCompany: number;
  revisionsPerBriefing: number;
  activeSpacesPerProject: number;
}

export const ARCHITECTURE_PLAN_LIMITS: Record<
  AppPlan,
  ArchitecturePlanLimits
> = {
  free: {
    activeBriefingsPerCompany: 1,
    revisionsPerBriefing: 1,
    activeSpacesPerProject: 3,
  },
  pro: {
    activeBriefingsPerCompany: 200,
    revisionsPerBriefing: 25,
    activeSpacesPerProject: 100,
  },
  ultimate: {
    activeBriefingsPerCompany: 500,
    revisionsPerBriefing: 100,
    activeSpacesPerProject: 250,
  },
};

export type ArchitectureLimitKind =
  | "briefings"
  | "revisions"
  | "spaces";

export function getArchitecturePlanLimits(
  plan: AppPlan,
): ArchitecturePlanLimits {
  return ARCHITECTURE_PLAN_LIMITS[plan];
}

export function architectureLimitMessage(
  kind: ArchitectureLimitKind,
  plan: AppPlan,
): string {
  const limits = getArchitecturePlanLimits(plan);

  if (kind === "briefings") {
    return plan === "free"
      ? "O Grátis permite um briefing ativo. Seus dados continuam disponíveis; assine o Pro para usar briefings em outros projetos."
      : `Seu plano permite até ${limits.activeBriefingsPerCompany} briefings ativos. Arquive um briefing sem uso ou fale com o suporte.`;
  }

  if (kind === "revisions") {
    return plan === "free"
      ? "O Grátis inclui uma rodada de briefing. Assine o Pro para reabrir respostas e manter novas revisões."
      : `Este briefing atingiu ${limits.revisionsPerBriefing} revisões. O histórico permanece protegido.`;
  }

  return plan === "free"
    ? "O Grátis permite até 3 ambientes ativos. Os ambientes existentes continuam disponíveis; assine o Pro para adicionar mais."
    : `Este projeto atingiu ${limits.activeSpacesPerProject} ambientes ativos. Arquive ambientes sem uso ou fale com o suporte.`;
}
