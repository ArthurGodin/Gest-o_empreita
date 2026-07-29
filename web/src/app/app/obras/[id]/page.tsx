import { notFound } from "next/navigation";
import { PageContainer } from "@/components/app-shell/page-container";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import { getProject } from "@/lib/queries/projects";
import { ProjectHeader } from "./project-header";
import {
  getProjectWorkspaceViews,
  resolveProjectWorkspaceView,
} from "./project-workspace";
import { ProjectWorkspaceContent } from "./project-workspace-content";
import { ProjectWorkspaceNav } from "./project-workspace-nav";
import { ProjectWorkspaceView } from "./project-workspace-view";

interface ProjectDetailSearchParams {
  cobranca?: string;
  view?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  return {
    title: project ? `${project.name} — Projetos` : "Projeto não encontrado",
  };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<ProjectDetailSearchParams>;
}) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<ProjectDetailSearchParams>({}),
  ]);
  const [project, company] = await Promise.all([
    getProject(id),
    getActiveCompanyFull(),
  ]);

  if (!project) notFound();

  const segment = company?.business_segment ?? "construction";
  const conversionBillingAttention = query.cobranca === "atencao";
  const activeView = resolveProjectWorkspaceView({
    value: query.view,
    segment,
    billingAttention: conversionBillingAttention,
  });
  const views = getProjectWorkspaceViews(segment);
  const activeViewLabel =
    views.find((view) => view.id === activeView)?.label ?? "Resumo";

  return (
    <PageContainer spacing="compact">
      <ProjectHeader project={project} />
      <ProjectWorkspaceNav
        activeView={activeView}
        segment={segment}
        views={views}
      />
      <ProjectWorkspaceView label={activeViewLabel}>
        <ProjectWorkspaceContent
          activeView={activeView}
          company={company}
          conversionBillingAttention={conversionBillingAttention}
          project={project}
        />
      </ProjectWorkspaceView>
    </PageContainer>
  );
}
