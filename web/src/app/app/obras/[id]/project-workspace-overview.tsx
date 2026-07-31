import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  DoorOpen,
  ListChecks,
  PackageCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { MetricStrip, MetricTile } from "@/components/app-shell/metric-strip";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { BusinessSegment } from "@/lib/business-segment";
import type { ProjectBriefing } from "@/lib/queries/briefings";
import type { ProjectDeliverable } from "@/lib/queries/deliverables";
import type { ProjectSpace } from "@/lib/queries/project-spaces";
import type {
  ProjectListItem,
  ProjectOverviewData,
} from "@/lib/queries/projects";
import { todayBR } from "@/lib/dates";
import {
  buildProjectWorkspaceHref,
  hasProfessionalProjectTools,
  type ProjectWorkspaceView,
} from "./project-workspace";

interface ProjectWorkspaceOverviewProps {
  briefing: ProjectBriefing | null;
  deliverables: ProjectDeliverable[];
  isDemoWorkspace: boolean;
  overview: ProjectOverviewData;
  project: ProjectListItem;
  segment: BusinessSegment;
  spaces: ProjectSpace[];
}

interface WorkspaceAction {
  description: string;
  hash?: string;
  icon: LucideIcon;
  label: string;
  view: ProjectWorkspaceView;
}

const PAID_CHARGE_STATUSES = new Set(["received", "confirmed"]);

export function ProjectWorkspaceOverview({
  briefing,
  deliverables,
  isDemoWorkspace,
  overview,
  project,
  segment,
  spaces,
}: ProjectWorkspaceOverviewProps) {
  const professionalTools = hasProfessionalProjectTools(segment);
  const activeDeliverables = deliverables.filter(
    (deliverable) => deliverable.archived_at === null,
  );
  const incompleteSpaces = spaces.filter(
    (space) => space.status === "incomplete",
  ).length;
  const pendingRequirements = spaces.reduce(
    (total, space) =>
      total +
      space.requirements.filter((requirement) => requirement.status === "pending")
        .length,
    0,
  );
  const pendingDeliverables = activeDeliverables.filter(
    (deliverable) =>
      deliverable.state === "waiting_review" ||
      deliverable.state === "changes_requested",
  ).length;
  const completedStages = overview.stages.filter(
    (stage) => stage.status === "done",
  ).length;
  const currentStage =
    overview.stages.find((stage) => stage.status === "in_progress") ??
    overview.stages.find((stage) => stage.status === "todo") ??
    null;
  const receivedCents = overview.charges
    .filter((charge) => PAID_CHARGE_STATUSES.has(charge.status))
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const pendingCents = overview.charges
    .filter(
      (charge) =>
        !PAID_CHARGE_STATUSES.has(charge.status) &&
        charge.status !== "cancelled",
    )
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const hasOverdueCharge = overview.charges.some(
    (charge) => charge.status === "overdue",
  );
  const totalCents =
    project.budget_cents ??
    overview.charges.reduce((sum, charge) => sum + charge.amount_cents, 0);
  const nextAction = deriveNextAction({
    briefing,
    currentStageName: currentStage?.name ?? null,
    hasOverdueCharge,
    incompleteSpaces,
    isDemoWorkspace,
    pendingDeliverables,
    pendingRequirements,
    professionalTools,
    spacesCount: spaces.length,
    stagesCount: overview.stages.length,
  });
  const nextActionHref = buildProjectWorkspaceHref({
    pathname: `/app/obras/${project.id}`,
    view: nextAction.view,
    hash: nextAction.hash,
  });
  const projectLate =
    project.ends_on !== null &&
    project.ends_on < todayBR() &&
    project.status !== "completed" &&
    project.status !== "cancelled";
  const NextActionIcon = nextAction.icon;

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="project-overview-title"
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <NextActionIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-emerald-700">
              Próxima ação
            </p>
            <h2
              id="project-overview-title"
              className="mt-1 text-base font-semibold text-foreground"
            >
              {nextAction.label}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              {nextAction.description}
            </p>
          </div>
        </div>
        <Link
          href={nextActionHref}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Abrir {workspaceViewLabel(nextAction.view)}
        </Link>
      </section>

      <MetricStrip ariaLabel="Resumo do projeto" className="xl:grid-cols-4">
        <MetricTile
          label="Progresso"
          value={`${project.progress_pct ?? 0}%`}
          hint={
            overview.stages.length > 0
              ? `${completedStages} de ${overview.stages.length} etapas concluídas`
              : "Etapas ainda não definidas"
          }
          tone={completedStages > 0 ? "green" : "neutral"}
          icon={<ListChecks className="h-4 w-4" />}
        />
        <MetricTile
          label="Prazo"
          value={project.ends_on ? formatDateBR(project.ends_on) : "Sem prazo"}
          hint={
            projectLate
              ? "Prazo ultrapassado"
              : currentStage
                ? `Agora: ${currentStage.name}`
                : "Sem etapa em andamento"
          }
          tone={projectLate ? "red" : project.ends_on ? "blue" : "neutral"}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <MetricTile
          label={isDemoWorkspace ? "Contrato simulado" : "Contrato"}
          value={totalCents > 0 ? formatBRL(totalCents / 100) : "Sem valor"}
          hint={
            isDemoWorkspace ? "Valor fictício para avaliação" : "Valor aprovado"
          }
          tone={totalCents > 0 ? "amber" : "neutral"}
          icon={<Banknote className="h-4 w-4" />}
        />
        <MetricTile
          label={isDemoWorkspace ? "Financeiro simulado" : "Recebido"}
          value={formatBRL(receivedCents / 100)}
          hint={
            pendingCents > 0
              ? `${formatBRL(pendingCents / 100)} em aberto`
              : "Sem valor em aberto"
          }
          tone={isDemoWorkspace ? "neutral" : pendingCents > 0 ? "blue" : "green"}
          icon={
            isDemoWorkspace ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )
          }
        />
      </MetricStrip>

      {professionalTools ? (
        <section
          aria-label="Planejamento e retorno do cliente"
          className="grid divide-y rounded-lg border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          <OverviewLink
            href={buildProjectWorkspaceHref({
              pathname: `/app/obras/${project.id}`,
              view: "briefing",
            })}
            icon={ClipboardCheck}
            label="Briefing"
            value={briefing ? `${briefing.activeRevision.progress}%` : "Não iniciado"}
            hint={briefingStatusHint(briefing)}
            attention={briefing?.status === "submitted"}
          />
          <OverviewLink
            href={buildProjectWorkspaceHref({
              pathname: `/app/obras/${project.id}`,
              view: "ambientes",
            })}
            icon={DoorOpen}
            label="Ambientes"
            value={String(spaces.length)}
            hint={
              pendingRequirements > 0
                ? `${pendingRequirements} necessidades pendentes`
                : incompleteSpaces > 0
                  ? `${incompleteSpaces} ainda em definição`
                  : "Nenhuma pendência aberta"
            }
            attention={pendingRequirements > 0 || incompleteSpaces > 0}
          />
          <OverviewLink
            href={buildProjectWorkspaceHref({
              pathname: `/app/obras/${project.id}`,
              view: "entregas",
            })}
            icon={PackageCheck}
            label="Retorno do cliente"
            value={String(pendingDeliverables)}
            hint={
              pendingDeliverables > 0
                ? "Entregas exigem atenção"
                : `${activeDeliverables.length} entregas ativas`
            }
            attention={pendingDeliverables > 0}
          />
        </section>
      ) : (
        <section
          aria-label="Atividade do projeto"
          className="grid divide-y rounded-lg border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          <OverviewLink
            href={buildProjectWorkspaceHref({
              pathname: `/app/obras/${project.id}`,
              view: "etapas",
            })}
            icon={ListChecks}
            label="Etapa atual"
            value={currentStage?.name ?? "Não definida"}
            hint={`${completedStages} etapas concluídas`}
            attention={overview.stages.length === 0}
          />
          <OverviewLink
            href={buildProjectWorkspaceHref({
              pathname: `/app/obras/${project.id}`,
              view: "entregas",
            })}
            icon={PackageCheck}
            label="Entregas"
            value={String(activeDeliverables.length)}
            hint={
              pendingDeliverables > 0
                ? `${pendingDeliverables} aguardam retorno`
                : "Nenhuma pendência do cliente"
            }
            attention={pendingDeliverables > 0}
          />
          <OverviewLink
            href={buildProjectWorkspaceHref({
              pathname: `/app/obras/${project.id}`,
              view: "gestao",
              hash: "diario",
            })}
            icon={ClipboardCheck}
            label="Registros"
            value={String(overview.diary_total)}
            hint="Entradas no diário"
            attention={overview.diary_total === 0}
          />
        </section>
      )}
    </div>
  );
}

function OverviewLink({
  attention,
  href,
  icon: Icon,
  hint,
  label,
  value,
}: {
  attention: boolean;
  href: string;
  icon: LucideIcon;
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-24 min-w-0 items-start gap-3 p-4 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span
        className={
          attention
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        }
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <strong className="mt-1 block break-words text-sm text-foreground">
          {value}
        </strong>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {hint}
        </span>
      </span>
    </Link>
  );
}

function deriveNextAction({
  briefing,
  currentStageName,
  hasOverdueCharge,
  incompleteSpaces,
  isDemoWorkspace,
  pendingDeliverables,
  pendingRequirements,
  professionalTools,
  spacesCount,
  stagesCount,
}: {
  briefing: ProjectBriefing | null;
  currentStageName: string | null;
  hasOverdueCharge: boolean;
  incompleteSpaces: number;
  isDemoWorkspace: boolean;
  pendingDeliverables: number;
  pendingRequirements: number;
  professionalTools: boolean;
  spacesCount: number;
  stagesCount: number;
}): WorkspaceAction {
  if (professionalTools && !briefing) {
    return {
      label: "Comece pelo contexto do cliente",
      description:
        "Crie o briefing para registrar objetivos, rotina, referências, prazo e investimento.",
      icon: ClipboardCheck,
      view: "briefing",
    };
  }
  if (professionalTools && briefing?.status === "draft") {
    return {
      label: "Compartilhe o briefing",
      description:
        "O formulário está preparado e ainda precisa ser enviado ao cliente.",
      icon: ClipboardCheck,
      view: "briefing",
    };
  }
  if (professionalTools && briefing?.status === "submitted") {
    return {
      label: "Revise as respostas recebidas",
      description:
        "O cliente concluiu o briefing. Registre a revisão antes de avançar o escopo.",
      icon: CircleAlert,
      view: "briefing",
    };
  }
  if (professionalTools && (spacesCount === 0 || incompleteSpaces > 0)) {
    return {
      label:
        spacesCount === 0
          ? "Monte o programa de ambientes"
          : `Defina ${incompleteSpaces} ambiente${incompleteSpaces === 1 ? "" : "s"}`,
      description:
        "Organize prioridades e necessidades antes de detalhar as próximas entregas.",
      icon: DoorOpen,
      view: "ambientes",
    };
  }
  if (professionalTools && pendingRequirements > 0) {
    return {
      label: `Resolva ${pendingRequirements} necessidade${pendingRequirements === 1 ? "" : "s"}`,
      description:
        "Existem decisões de ambiente ainda abertas para fechar o escopo.",
      icon: CircleAlert,
      view: "ambientes",
    };
  }
  if (pendingDeliverables > 0) {
    return {
      label: "Acompanhe o retorno do cliente",
      description:
        "Há entregas aguardando aprovação ou ajustes solicitados pelo cliente.",
      icon: PackageCheck,
      view: "entregas",
    };
  }
  if (stagesCount === 0) {
    return {
      label: "Defina as etapas do trabalho",
      description:
        "Organize o cronograma para acompanhar avanço, prazo e responsabilidades.",
      icon: ListChecks,
      view: "etapas",
    };
  }
  if (hasOverdueCharge && !isDemoWorkspace) {
    return {
      label: "Resolva a cobrança vencida",
      description:
        "Revise a parcela em atraso antes de continuar acumulando custos.",
      hash: "cobranca",
      icon: Banknote,
      view: "gestao",
    };
  }
  if (currentStageName) {
    return {
      label: `Avance em ${currentStageName}`,
      description:
        "Atualize o andamento quando houver uma mudança concreta nesta etapa.",
      icon: ListChecks,
      view: "etapas",
    };
  }
  return {
    label: "Registre o próximo avanço",
    description:
      "Use o diário para manter decisões, fotos e contexto do trabalho organizados.",
    hash: "diario",
    icon: CheckCircle2,
    view: "gestao",
  };
}

function briefingStatusHint(briefing: ProjectBriefing | null) {
  if (!briefing) return "Contexto ainda não registrado";
  if (briefing.status === "draft") return "Pronto para compartilhar";
  if (briefing.status === "shared") return "Cliente preenchendo";
  if (briefing.status === "submitted") return "Aguardando revisão interna";
  if (briefing.status === "reviewed") return "Revisado pelo escritório";
  return "Histórico preservado";
}

function workspaceViewLabel(view: ProjectWorkspaceView) {
  return {
    resumo: "Resumo",
    briefing: "Briefing",
    ambientes: "Ambientes",
    etapas: "Etapas",
    entregas: "Entregas",
    gestao: "Gestão",
  }[view];
}
