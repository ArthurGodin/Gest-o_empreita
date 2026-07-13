import { notFound } from "next/navigation";
import { getProjectWithRelations } from "@/lib/queries/projects";
import { listTemplates } from "@/lib/queries/stage-templates";
import { ProjectHeader } from "./project-header";
import { StatusSuggestion } from "./status-suggestion";
import { StagesSection } from "./stages-section";
import { DiarySection } from "./diary-section";
import { CostsSection } from "./costs-section";
import { TimeSection } from "./time-section";
import { PublicLinkCallout } from "./public-link-callout";
import { BillingSection } from "./billing-section";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectWithRelations(id);
  return {
    title: project ? `${project.name} — Obras` : "Obra não encontrada",
  };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ cobranca?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const conversionBillingAttention = query.cobranca === "atencao";
  const [project, templates] = await Promise.all([
    getProjectWithRelations(id),
    listTemplates(),
  ]);

  if (!project) notFound();

  return (
    <div className="container max-w-4xl space-y-4 py-6">
      <ProjectHeader project={project} />

      <StatusSuggestion
        projectId={project.id}
        current={project.status}
        stages={project.stages}
      />

      <StagesSection
        projectId={project.id}
        stages={project.stages}
        progressPct={project.progress_pct}
        startsOn={project.starts_on}
        templates={templates}
      />

      <BillingSection
        charges={project.charges}
        projectStatus={project.status}
        budgetCents={project.budget_cents}
        deliveryApprovedAt={project.delivery_approved_at}
        conversionBillingAttention={conversionBillingAttention}
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

      <TimeSection
        projectId={project.id}
        today={project.time_today}
        historyCount={project.time_history_count}
      />

      <PublicLinkCallout shareToken={project.share_token} />
    </div>
  );
}
