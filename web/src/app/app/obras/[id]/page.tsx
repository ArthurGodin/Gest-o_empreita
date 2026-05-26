import { notFound } from "next/navigation";
import { Timer } from "lucide-react";
import { getProjectWithRelations } from "@/lib/queries/projects";
import { listTemplates } from "@/lib/queries/stage-templates";
import { ProjectHeader } from "./project-header";
import { StagesSection } from "./stages-section";
import { DiarySection } from "./diary-section";
import { CostsSection } from "./costs-section";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectWithRelations(params.id);
  return {
    title: project ? `${project.name} — Obras` : "Obra não encontrada",
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [project, templates] = await Promise.all([
    getProjectWithRelations(params.id),
    listTemplates(),
  ]);

  if (!project) notFound();

  return (
    <div className="container max-w-4xl space-y-4 py-6">
      <ProjectHeader project={project} />

      <StagesSection
        projectId={project.id}
        stages={project.stages}
        progressPct={project.progress_pct}
        startsOn={project.starts_on}
        templates={templates}
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <DiarySection
          projectId={project.id}
          entries={project.diary}
          total={project.diary_total}
        />
        <CostsSection
          projectId={project.id}
          costs={project.costs}
          summary={project.cost_summary}
          stages={project.stages}
        />
      </div>

      <PlaceholderCard
        icon={<Timer className="h-6 w-6 text-muted-foreground" />}
        title="Ponto da equipe"
        description="Bater ponto pelos peões vem no PR 5."
      />
    </div>
  );
}

function PlaceholderCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-background">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
