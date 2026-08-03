import {
  normalizeBusinessSegment,
  type BusinessSegment,
} from "@/lib/business-segment";

export const ACTIVATION_GOALS = [
  "sell",
  "existing_project",
  "client_briefing",
  "deliverables",
  "execution_control",
] as const;

export type ActivationGoal = (typeof ACTIVATION_GOALS)[number];

export interface ActivationGoalOption {
  value: ActivationGoal;
  title: string;
  description: string;
}

const GOALS_BY_SEGMENT: Record<
  BusinessSegment,
  readonly ActivationGoalOption[]
> = {
  architecture: [
    {
      value: "sell",
      title: "Conseguir um novo projeto",
      description: "Cadastre o cliente e prepare uma proposta profissional.",
    },
    {
      value: "existing_project",
      title: "Organizar projeto contratado",
      description: "Comece pelas etapas de um trabalho que ja foi fechado.",
    },
    {
      value: "client_briefing",
      title: "Enviar briefing ao cliente",
      description: "Crie o projeto e colete as informacoes pelo link.",
    },
  ],
  interiors: [
    {
      value: "sell",
      title: "Conseguir um novo projeto",
      description: "Cadastre o cliente e prepare uma proposta profissional.",
    },
    {
      value: "existing_project",
      title: "Organizar projeto contratado",
      description: "Comece pelos ambientes e etapas do trabalho fechado.",
    },
    {
      value: "client_briefing",
      title: "Enviar briefing ao cliente",
      description: "Crie o projeto e entenda necessidades e preferencias.",
    },
  ],
  engineering: [
    {
      value: "sell",
      title: "Conseguir um novo servico",
      description: "Cadastre o cliente e prepare uma proposta tecnica.",
    },
    {
      value: "existing_project",
      title: "Organizar servico contratado",
      description: "Estruture etapas e prazos de um trabalho em andamento.",
    },
    {
      value: "deliverables",
      title: "Preparar entregas tecnicas",
      description: "Crie o projeto e organize arquivos, versoes e aceite.",
    },
  ],
  construction: [
    {
      value: "sell",
      title: "Conseguir uma nova obra",
      description: "Cadastre o cliente e monte o primeiro orcamento.",
    },
    {
      value: "existing_project",
      title: "Organizar obra contratada",
      description: "Comece pelas etapas de uma obra que ja foi fechada.",
    },
    {
      value: "execution_control",
      title: "Controlar execucao e custos",
      description: "Crie a obra e registre etapas, diario e despesas.",
    },
  ],
};

export function isActivationGoal(value: unknown): value is ActivationGoal {
  return (
    typeof value === "string" &&
    ACTIVATION_GOALS.includes(value as ActivationGoal)
  );
}

export function getActivationGoalOptions(
  segment: unknown,
): readonly ActivationGoalOption[] {
  return GOALS_BY_SEGMENT[normalizeBusinessSegment(segment)];
}

export function isActivationGoalAllowed(
  goal: unknown,
  segment: unknown,
): goal is ActivationGoal {
  return (
    isActivationGoal(goal) &&
    getActivationGoalOptions(segment).some((option) => option.value === goal)
  );
}

export function normalizeActivationGoal(
  goal: unknown,
  segment: unknown,
): ActivationGoal {
  return isActivationGoalAllowed(goal, segment) ? goal : "sell";
}

export function getActivationGoalOption(
  goal: unknown,
  segment: unknown,
): ActivationGoalOption {
  const normalized = normalizeActivationGoal(goal, segment);
  return getActivationGoalOptions(segment).find(
    (option) => option.value === normalized,
  )!;
}

export function activationGoalStartHref(goal: ActivationGoal): string {
  return goal === "sell"
    ? "/app/clientes/novo?after=quote"
    : `/app/obras/novo?goal=${goal}`;
}

