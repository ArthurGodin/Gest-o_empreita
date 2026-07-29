import {
  getBusinessVocabulary,
  normalizeBusinessSegment,
  type BusinessSegment,
} from "@/lib/business-segment";

export interface DemoWorkspaceSnapshot {
  quoteId: string;
  quoteTitle: string;
  shareToken: string;
  projectId: string;
  projectName: string;
}

export type DemoWorkspaceStepId =
  | "quote"
  | "public_view"
  | "pdf"
  | "project"
  | "briefing"
  | "spaces"
  | "deliverables"
  | "finance";

export interface DemoWorkspaceStep {
  id: DemoWorkspaceStepId;
  title: string;
  detail: string;
  href: string | null;
  external: boolean;
}

export function buildDemoWorkspaceSteps(
  segmentValue: unknown,
  snapshot: DemoWorkspaceSnapshot | null,
  appUrl: string,
): DemoWorkspaceStep[] {
  const segment = normalizeBusinessSegment(segmentValue);
  const vocabulary = getBusinessVocabulary(segment);
  const projectUrl = snapshot ? `/app/obras/${snapshot.projectId}` : null;
  const publicUrl = snapshot
    ? `${appUrl.replace(/\/$/, "")}/q/${snapshot.shareToken}`
    : null;
  const professionalArchitecture =
    segment === "architecture" || segment === "interiors";

  const steps: DemoWorkspaceStep[] = [
    {
      id: "quote",
      title: vocabulary.quoteSingular,
      detail: "Escopo, itens, valores, revisões e envio.",
      href: snapshot ? `/app/orcamentos/${snapshot.quoteId}` : null,
      external: false,
    },
    {
      id: "public_view",
      title: "Visão do cliente",
      detail: "Link público com aceite sem exigir login.",
      href: publicUrl,
      external: true,
    },
    {
      id: "pdf",
      title: "PDF",
      detail: "Documento pronto para compartilhar ou arquivar.",
      href: publicUrl ? `${publicUrl}/pdf` : null,
      external: true,
    },
    {
      id: "project",
      title: vocabulary.projectSingular,
      detail: "Resumo, prazo e andamento do trabalho aprovado.",
      href: projectUrl,
      external: false,
    },
  ];

  if (professionalArchitecture) {
    steps.push(
      {
        id: "briefing",
        title: "Briefing",
        detail: "Respostas versionadas e revisão com o cliente.",
        href: projectUrl ? `${projectUrl}?view=briefing` : null,
        external: false,
      },
      {
        id: "spaces",
        title: "Ambientes",
        detail: "Programa de necessidades, prioridades e pendências.",
        href: projectUrl ? `${projectUrl}?view=ambientes` : null,
        external: false,
      },
    );
  }

  steps.push(
    {
      id: "deliverables",
      title: "Entregas",
      detail: "Versões, publicação e retorno do cliente.",
      href: projectUrl ? `${projectUrl}?view=entregas` : null,
      external: false,
    },
    {
      id: "finance",
      title: "Financeiro protegido",
      detail: "Entrada, saldo, custos e margem sem cobrança real.",
      href: snapshot ? "/app/financeiro" : null,
      external: false,
    },
  );

  return steps;
}

export function demoWorkspaceTitle(segment: BusinessSegment): string {
  if (segment === "architecture") return "Projeto residencial completo";
  if (segment === "interiors") return "Projeto de interiores completo";
  if (segment === "engineering") return "Serviço técnico completo";
  return "Obra completa";
}
