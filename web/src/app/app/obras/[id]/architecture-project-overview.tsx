import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  DoorOpen,
  PackageCheck,
  UserRoundCheck,
} from "lucide-react";
import { MetricStrip, MetricTile } from "@/components/app-shell/metric-strip";
import type { ProjectBriefing } from "@/lib/queries/briefings";
import type { ProjectSpace } from "@/lib/queries/project-spaces";
import type { ProjectDeliverable } from "@/lib/queries/deliverables";

interface ArchitectureProjectOverviewProps {
  briefing: ProjectBriefing | null;
  spaces: ProjectSpace[];
  deliverables: ProjectDeliverable[];
}

export function ArchitectureProjectOverview({
  briefing,
  spaces,
  deliverables,
}: ArchitectureProjectOverviewProps) {
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
  const pendingDeliverables = deliverables.filter(
    (deliverable) =>
      deliverable.state === "waiting_review" ||
      deliverable.state === "changes_requested",
  ).length;
  const nextAction = deriveNextAction({
    briefing,
    spaces,
    incompleteSpaces,
    pendingRequirements,
    pendingDeliverables,
  });

  return (
    <section
      aria-labelledby="project-overview-title"
      className="space-y-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-700">
            Visão do projeto
          </p>
          <h2
            id="project-overview-title"
            className="mt-1 text-base font-semibold text-foreground"
          >
            O que precisa acontecer agora
          </h2>
        </div>
        <a
          href={nextAction.href}
          className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <nextAction.icon aria-hidden="true" className="h-4 w-4" />
          {nextAction.label}
        </a>
      </div>

      <MetricStrip
        ariaLabel="Resumo do planejamento do projeto"
        className="xl:grid-cols-4"
      >
        <MetricTile
          label="Briefing"
          value={briefing ? `${briefing.activeRevision.progress}%` : "Não iniciado"}
          hint={briefingStatusHint(briefing)}
          tone={
            briefing?.status === "submitted" || briefing?.status === "reviewed"
              ? "green"
              : briefing
                ? "blue"
                : "neutral"
          }
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <MetricTile
          label="Ambientes"
          value={String(spaces.length)}
          hint={
            spaces.length === 0
              ? "Programa ainda vazio"
              : incompleteSpaces > 0
                ? `${incompleteSpaces} precisam de definição`
                : "Todos definidos"
          }
          tone={incompleteSpaces > 0 ? "amber" : spaces.length > 0 ? "green" : "neutral"}
          icon={<DoorOpen className="h-4 w-4" />}
        />
        <MetricTile
          label="Necessidades"
          value={String(pendingRequirements)}
          hint={
            pendingRequirements > 0
              ? "Pendentes de definição"
              : "Nenhuma pendência aberta"
          }
          tone={pendingRequirements > 0 ? "amber" : "green"}
          icon={<CircleAlert className="h-4 w-4" />}
        />
        <MetricTile
          label="Retorno do cliente"
          value={String(pendingDeliverables)}
          hint={
            pendingDeliverables > 0
              ? "Entregas exigem atenção"
              : "Nenhuma entrega pendente"
          }
          tone={pendingDeliverables > 0 ? "blue" : "green"}
          icon={<UserRoundCheck className="h-4 w-4" />}
        />
      </MetricStrip>
    </section>
  );
}

function deriveNextAction(input: {
  briefing: ProjectBriefing | null;
  spaces: ProjectSpace[];
  incompleteSpaces: number;
  pendingRequirements: number;
  pendingDeliverables: number;
}) {
  if (!input.briefing) {
    return {
      label: "Criar briefing",
      href: "#briefing",
      icon: ClipboardCheck,
    };
  }
  if (input.briefing.status === "draft") {
    return {
      label: "Compartilhar briefing",
      href: "#briefing",
      icon: UserRoundCheck,
    };
  }
  if (input.briefing.status === "shared") {
    return {
      label: `Acompanhar briefing · ${input.briefing.activeRevision.progress}%`,
      href: "#briefing",
      icon: ClipboardCheck,
    };
  }
  if (input.briefing.status === "submitted") {
    return {
      label: "Revisar respostas",
      href: "#briefing",
      icon: CircleAlert,
    };
  }
  if (input.spaces.length === 0 || input.incompleteSpaces > 0) {
    return {
      label:
        input.spaces.length === 0
          ? "Montar ambientes"
          : `Definir ${input.incompleteSpaces} ambiente${input.incompleteSpaces === 1 ? "" : "s"}`,
      href: "#ambientes",
      icon: DoorOpen,
    };
  }
  if (input.pendingRequirements > 0) {
    return {
      label: `Resolver ${input.pendingRequirements} necessidade${input.pendingRequirements === 1 ? "" : "s"}`,
      href: "#ambientes",
      icon: CheckCircle2,
    };
  }
  if (input.pendingDeliverables > 0) {
    return {
      label: "Revisar entregas",
      href: "#entregas",
      icon: PackageCheck,
    };
  }
  return {
    label: "Projeto organizado",
    href: "#etapas",
    icon: CheckCircle2,
  };
}

function briefingStatusHint(briefing: ProjectBriefing | null) {
  if (!briefing) return "Comece pelo contexto do cliente";
  if (briefing.status === "draft") return "Pronto para compartilhar";
  if (briefing.status === "shared") return "Cliente preenchendo";
  if (briefing.status === "submitted") return "Aguardando revisão interna";
  if (briefing.status === "reviewed") return "Revisado pelo escritório";
  return "Histórico preservado";
}
