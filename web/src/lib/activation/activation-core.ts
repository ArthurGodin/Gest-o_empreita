import {
  activationGoalStartHref,
  normalizeActivationGoal,
  type ActivationGoal,
} from "@/lib/activation-goals";
import {
  getBusinessVocabulary,
  isProfessionalSegment,
  normalizeBusinessSegment,
  type BusinessSegment,
} from "@/lib/business-segment";
import type { ActivationMilestones } from "@/lib/queries/activation";

export type ActivationStage =
  | "customer"
  | "quote"
  | "share"
  | "approval"
  | "project"
  | "stage"
  | "briefing"
  | "briefing_share"
  | "deliverable"
  | "management_record";

export interface ActivationStep {
  id: ActivationStage;
  title: string;
  detail: string;
  href: string;
  action: string;
  done: boolean;
}

interface ActivationCompany {
  business_segment?: string | null;
  activation_goal?: string | null;
}

interface ActivationQuote {
  id: string;
  title: string;
  status: string;
  effective_status: string;
  total_cents: number;
  project_id: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
}

interface ActivationProject {
  id: string;
}

export interface ActivationInput {
  company: ActivationCompany | null;
  customersCount: number;
  quotes: ActivationQuote[];
  projects: ActivationProject[];
  milestones?: ActivationMilestones;
}

export interface ActivationProgress {
  goal: ActivationGoal;
  segment: BusinessSegment;
  guideTitle: string;
  steps: ActivationStep[];
  nextStep: ActivationStep | null;
  doneCount: number;
  totalCount: number;
  progressPercent: number;
  isComplete: boolean;
}

const EMPTY_MILESTONES: ActivationMilestones = {
  stageProjectIds: [],
  briefings: [],
  deliverableProjectIds: [],
  managementProjectIds: [],
};

export function buildActivationProgress(
  input: ActivationInput,
): ActivationProgress {
  const segment = normalizeBusinessSegment(input.company?.business_segment);
  const goal = normalizeActivationGoal(
    input.company?.activation_goal,
    segment,
  );
  const milestones = input.milestones ?? EMPTY_MILESTONES;

  switch (goal) {
    case "existing_project":
      return buildExistingProjectProgress(input, milestones, segment, goal);
    case "client_briefing":
      return buildBriefingProgress(input, milestones, segment, goal);
    case "deliverables":
      return buildDeliverablesProgress(input, milestones, segment, goal);
    case "execution_control":
      return buildExecutionProgress(input, milestones, segment, goal);
    default:
      return buildSalesProgress(input, segment, goal);
  }
}

function buildSalesProgress(
  input: ActivationInput,
  segment: BusinessSegment,
  goal: ActivationGoal,
) {
  const vocabulary = getBusinessVocabulary(segment);
  const isProfessional = isProfessionalSegment(segment);
  const quoteLower = vocabulary.quoteSingular.toLowerCase();
  const firstQuote = input.quotes[0];
  const sharedQuote = input.quotes.find(isSharedQuote);
  const approvedQuote = input.quotes.find(
    (quote) => quote.effective_status === "approved",
  );
  const quoteHref = firstQuote
    ? `/app/orcamentos/${firstQuote.id}`
    : "/app/orcamentos/novo";
  const sharedHref = sharedQuote
    ? `/app/orcamentos/${sharedQuote.id}`
    : quoteHref;
  const approvalHref = approvedQuote
    ? `/app/orcamentos/${approvedQuote.id}`
    : sharedHref;

  return finalizeProgress(
    goal,
    segment,
    isProfessional
      ? "Caminho até o primeiro contrato"
      : "Caminho até a primeira venda",
    [
      customerStep(input.customersCount, "sell"),
      {
        id: "quote",
        title: vocabulary.quoteSingular,
        detail: firstQuote
          ? `${vocabulary.quoteSingular} ${isProfessional ? "criada" : "criado"}. Confira os itens antes de enviar.`
          : `Monte ${isProfessional ? "a primeira" : "o primeiro"} ${quoteLower}.`,
        href: quoteHref,
        action: firstQuote
          ? `Revisar ${quoteLower}`
          : `Criar ${quoteLower}`,
        done: Boolean(firstQuote),
      },
      {
        id: "share",
        title: "Envio",
        detail: sharedQuote
          ? "Link compartilhado ou aberto pelo cliente."
          : `Compartilhe o link ${isProfessional ? "da" : "do"} ${quoteLower}.`,
        href: sharedHref,
        action: sharedQuote ? `Acompanhar ${quoteLower}` : "Revisar e enviar",
        done: Boolean(sharedQuote),
      },
      {
        id: "approval",
        title: "Aceite",
        detail: approvedQuote
          ? "Aceite registrado no Prumo."
          : "Acompanhe a decisão do cliente.",
        href: approvalHref,
        action: approvedQuote ? "Ver aceite" : "Acompanhar aceite",
        done: Boolean(approvedQuote),
      },
    ],
  );
}

function buildExistingProjectProgress(
  input: ActivationInput,
  milestones: ActivationMilestones,
  segment: BusinessSegment,
  goal: ActivationGoal,
) {
  const vocabulary = getBusinessVocabulary(segment);
  const project = selectProject(input.projects, milestones.stageProjectIds);
  const projectHref = project
    ? `/app/obras/${project.id}?view=etapas`
    : activationGoalStartHref(goal);
  const hasStage = Boolean(
    project && milestones.stageProjectIds.includes(project.id),
  );

  return finalizeProgress(
    goal,
    segment,
    `Organize ${articleForProject(segment)} ${vocabulary.projectSingular.toLowerCase()} ${isProfessionalSegment(segment) ? "contratado" : "contratada"}`,
    [
      customerStep(input.customersCount, goal),
      projectStep(project, projectHref, segment, goal),
      {
        id: "stage",
        title: "Primeira etapa",
        detail: hasStage
          ? "A estrutura inicial do trabalho está organizada."
          : "Defina a primeira etapa para acompanhar o andamento.",
        href: projectHref,
        action: hasStage ? "Ver etapas" : "Adicionar etapa",
        done: hasStage,
      },
    ],
  );
}

function buildBriefingProgress(
  input: ActivationInput,
  milestones: ActivationMilestones,
  segment: BusinessSegment,
  goal: ActivationGoal,
) {
  const sharedProjectIds = milestones.briefings
    .filter((briefing) => briefing.sharedAt)
    .map((briefing) => briefing.projectId);
  const briefingProjectIds = milestones.briefings.map(
    (briefing) => briefing.projectId,
  );
  const project = selectProject(
    input.projects,
    sharedProjectIds.length > 0 ? sharedProjectIds : briefingProjectIds,
  );
  const projectHref = project
    ? `/app/obras/${project.id}?view=briefing`
    : activationGoalStartHref(goal);
  const briefing = project
    ? milestones.briefings.find((item) => item.projectId === project.id)
    : null;

  return finalizeProgress(goal, segment, "Briefing pronto para o cliente", [
    customerStep(input.customersCount, goal),
    projectStep(project, projectHref, segment, goal),
    {
      id: "briefing",
      title: "Briefing",
      detail: briefing
        ? "Briefing criado para este projeto."
        : "Prepare as perguntas para entender o cliente.",
      href: projectHref,
      action: briefing ? "Revisar briefing" : "Criar briefing",
      done: Boolean(briefing),
    },
    {
      id: "briefing_share",
      title: "Compartilhamento",
      detail: briefing?.sharedAt
        ? "Link do briefing compartilhado."
        : "Envie o link para o cliente responder de onde estiver.",
      href: projectHref,
      action: briefing?.sharedAt ? "Acompanhar respostas" : "Compartilhar briefing",
      done: Boolean(briefing?.sharedAt),
    },
  ]);
}

function buildDeliverablesProgress(
  input: ActivationInput,
  milestones: ActivationMilestones,
  segment: BusinessSegment,
  goal: ActivationGoal,
) {
  const project = selectProject(
    input.projects,
    milestones.deliverableProjectIds,
  );
  const projectHref = project
    ? `/app/obras/${project.id}?view=entregas`
    : activationGoalStartHref(goal);
  const hasDeliverable = Boolean(
    project && milestones.deliverableProjectIds.includes(project.id),
  );

  return finalizeProgress(goal, segment, "Prepare sua primeira entrega", [
    customerStep(input.customersCount, goal),
    projectStep(project, projectHref, segment, goal),
    {
      id: "deliverable",
      title: "Primeira entrega",
      detail: hasDeliverable
        ? "Uma entrega técnica já está organizada."
        : "Crie a primeira entrega para controlar arquivos e versões.",
      href: projectHref,
      action: hasDeliverable ? "Ver entregas" : "Criar entrega",
      done: hasDeliverable,
    },
  ]);
}

function buildExecutionProgress(
  input: ActivationInput,
  milestones: ActivationMilestones,
  segment: BusinessSegment,
  goal: ActivationGoal,
) {
  const preferredProjectIds =
    milestones.managementProjectIds.length > 0
      ? milestones.managementProjectIds
      : milestones.stageProjectIds;
  const project = selectProject(input.projects, preferredProjectIds);
  const projectBase = project ? `/app/obras/${project.id}` : null;
  const stageHref = projectBase
    ? `${projectBase}?view=etapas`
    : activationGoalStartHref(goal);
  const managementHref = projectBase
    ? `${projectBase}?view=gestao#custos`
    : activationGoalStartHref(goal);
  const hasStage = Boolean(
    project && milestones.stageProjectIds.includes(project.id),
  );
  const hasManagementRecord = Boolean(
    project && milestones.managementProjectIds.includes(project.id),
  );

  return finalizeProgress(goal, segment, "Controle sua primeira obra", [
    customerStep(input.customersCount, goal),
    projectStep(project, managementHref, segment, goal),
    {
      id: "stage",
      title: "Primeira etapa",
      detail: hasStage
        ? "A execução já possui uma etapa organizada."
        : "Divida a obra em etapas para acompanhar o avanço.",
      href: stageHref,
      action: hasStage ? "Ver etapas" : "Adicionar etapa",
      done: hasStage,
    },
    {
      id: "management_record",
      title: "Primeiro registro",
      detail: hasManagementRecord
        ? "Diário ou custo registrado na gestão da obra."
        : "Registre um custo ou atualização do diário.",
      href: managementHref,
      action: hasManagementRecord ? "Abrir gestão" : "Fazer registro",
      done: hasManagementRecord,
    },
  ]);
}

function customerStep(
  customersCount: number,
  goal: ActivationGoal,
): ActivationStep {
  const isSalesGoal = goal === "sell";
  const href = isSalesGoal
    ? customersCount > 0
      ? "/app/clientes"
      : "/app/clientes/novo?after=quote"
    : customersCount > 0
      ? "/app/clientes"
      : activationGoalStartHref(goal);

  return {
    id: "customer",
    title: "Cliente",
    detail:
      customersCount > 0
        ? "Primeiro cliente cadastrado."
        : isSalesGoal
          ? "Cadastre quem receberá sua proposta."
          : "Informe o cliente junto com o trabalho contratado.",
    href,
    action:
      customersCount > 0
        ? "Ver clientes"
        : isSalesGoal
          ? "Cadastrar cliente"
          : "Cadastrar trabalho",
    done: customersCount > 0,
  };
}

function projectStep(
  project: ActivationProject | undefined,
  projectHref: string,
  segment: BusinessSegment,
  goal: ActivationGoal,
): ActivationStep {
  const vocabulary = getBusinessVocabulary(segment);
  const projectLower = vocabulary.projectSingular.toLowerCase();

  return {
    id: "project",
    title: vocabulary.projectSingular,
    detail: project
      ? `${vocabulary.projectSingular} ${isProfessionalSegment(segment) ? "cadastrado" : "cadastrada"} no Prumo.`
      : `Cadastre ${articleForProject(segment)} ${projectLower} que já foi contratado.`,
    href: project ? projectHref : activationGoalStartHref(goal),
    action: project ? `Abrir ${projectLower}` : `Cadastrar ${projectLower}`,
    done: Boolean(project),
  };
}

function selectProject(
  projects: ActivationProject[],
  preferredProjectIds: string[],
) {
  const preferred = new Set(preferredProjectIds);
  return projects.find((project) => preferred.has(project.id)) ?? projects[0];
}

function finalizeProgress(
  goal: ActivationGoal,
  segment: BusinessSegment,
  guideTitle: string,
  steps: ActivationStep[],
): ActivationProgress {
  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? null;

  return {
    goal,
    segment,
    guideTitle,
    steps,
    nextStep,
    doneCount,
    totalCount: steps.length,
    progressPercent: Math.round((doneCount / steps.length) * 100),
    isComplete: nextStep === null,
  };
}

function isSharedQuote(quote: ActivationQuote): boolean {
  return Boolean(
    quote.sent_at ||
      quote.viewed_at ||
      quote.approved_at ||
      ["sent", "viewed", "approved"].includes(quote.effective_status),
  );
}

function articleForProject(segment: BusinessSegment) {
  return isProfessionalSegment(segment) ? "o" : "a";
}
