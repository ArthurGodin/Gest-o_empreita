import { notFound } from "next/navigation";
import { PageContainer } from "@/components/app-shell/page-container";
import { env } from "@/lib/env";
import { getProjectBriefing } from "@/lib/queries/briefings";
import { getProjectSpaces } from "@/lib/queries/project-spaces";
import { getProjectWithRelations } from "@/lib/queries/projects";
import { listTemplates } from "@/lib/queries/stage-templates";
import { ArchitectureProjectOverview } from "./architecture-project-overview";
import { BriefingSection } from "./briefing-section";
import { ProjectHeader } from "./project-header";
import { StatusSuggestion } from "./status-suggestion";
import { StagesSection } from "./stages-section";
import { DiarySection } from "./diary-section";
import { CostsSection } from "./costs-section";
import { TimeSection } from "./time-section";
import { PublicLinkCallout } from "./public-link-callout";
import { BillingSection } from "./billing-section";
import { ProjectSectionNav } from "./project-section-nav";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import {
  getDeliverableStorageUsage,
  getProjectDeliverables,
  getProjectDeliveryAcceptance,
} from "@/lib/queries/deliverables";
import { DeliverablesSection } from "./deliverables-section";
import { SpacesSection } from "./spaces-section";

const sectionAnchorClass =
  "min-w-0 scroll-mt-[calc(7.75rem+env(safe-area-inset-top))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:scroll-mt-24";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectWithRelations(id);
  return {
    title: project ? `${project.name} — Projetos` : "Projeto não encontrado",
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
  const [
    project,
    templates,
    company,
    deliverables,
    deliveryAcceptance,
    briefing,
    spaces,
  ] = await Promise.all([
    getProjectWithRelations(id),
    listTemplates(),
    getActiveCompanyFull(),
    getProjectDeliverables(id),
    getProjectDeliveryAcceptance(id),
    getProjectBriefing(id),
    getProjectSpaces(id),
  ]);

  if (!project) notFound();

  const architectureWorkspace =
    company?.business_segment === "architecture" ||
    company?.business_segment === "interiors";
  const projectLocked =
    project.status === "completed" ||
    project.status === "cancelled" ||
    Boolean(project.delivery_approved_at);
  const publicBriefingUrl = project.share_token
    ? `${env.NEXT_PUBLIC_APP_URL}/q/${project.share_token}?tab=briefing`
    : null;
  const deliverableStorageUsage = company
    ? await getDeliverableStorageUsage(company.id)
    : { usedBytes: 0, pendingBytes: 0, readyBytes: 0 };
  const managementSections = (
    <>
      <BillingSection
        charges={project.charges}
        businessSegment={company?.business_segment ?? "construction"}
        projectStatus={project.status}
        budgetCents={project.budget_cents}
        deliveryApprovedAt={project.delivery_approved_at}
        conversionBillingAttention={conversionBillingAttention}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.85fr)]">
        <div id="diario" tabIndex={-1} className={sectionAnchorClass}>
          <DiarySection
            projectId={project.id}
            entries={project.diary}
            total={project.diary_total}
          />
        </div>
        <div id="custos" tabIndex={-1} className={sectionAnchorClass}>
          <CostsSection
            projectId={project.id}
            costs={project.costs}
            summary={project.cost_summary}
            stages={project.stages}
          />
        </div>
      </div>

      <div id="equipe" tabIndex={-1} className={sectionAnchorClass}>
        <TimeSection
          projectId={project.id}
          today={project.time_today}
          historyCount={project.time_history_count}
        />
      </div>

      <PublicLinkCallout shareToken={project.share_token} />
    </>
  );

  return (
    <PageContainer spacing="compact">
      <ProjectHeader project={project} />

      <StatusSuggestion
        projectId={project.id}
        current={project.status}
        stages={project.stages}
      />

      <ProjectSectionNav />

      {architectureWorkspace ? (
        <>
          <div id="resumo" tabIndex={-1} className={sectionAnchorClass}>
            <ArchitectureProjectOverview
              briefing={briefing}
              spaces={spaces}
              deliverables={deliverables}
            />
          </div>

          <div id="briefing" tabIndex={-1} className={sectionAnchorClass}>
            <BriefingSection
              key={`${briefing?.activeRevision.id ?? "none"}:${spaces
                .map((space) => space.id)
                .join(",")}`}
              projectId={project.id}
              plan={company?.plan ?? "free"}
              segment={company?.business_segment ?? "architecture"}
              briefing={briefing}
              spaces={spaces}
              publicUrl={publicBriefingUrl}
              projectLocked={projectLocked}
            />
          </div>

          <div id="ambientes" tabIndex={-1} className={sectionAnchorClass}>
            <SpacesSection
              projectId={project.id}
              plan={company?.plan ?? "free"}
              spaces={spaces}
              projectLocked={projectLocked}
            />
          </div>
        </>
      ) : null}

      <div id="etapas" tabIndex={-1} className={sectionAnchorClass}>
        <StagesSection
          projectId={project.id}
          stages={project.stages}
          progressPct={project.progress_pct}
          startsOn={project.starts_on}
          templates={templates}
        />
      </div>

      <DeliverablesSection
        projectId={project.id}
        shareToken={project.share_token}
        plan={company?.plan ?? "free"}
        projectLocked={projectLocked}
        stages={project.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
        }))}
        deliverables={deliverables}
        storageUsage={deliverableStorageUsage}
        acceptance={deliveryAcceptance}
      />

      {architectureWorkspace ? (
        <div
          id="gestao"
          tabIndex={-1}
          className={`${sectionAnchorClass} space-y-4`}
        >
          {managementSections}
        </div>
      ) : (
        managementSections
      )}
    </PageContainer>
  );
}
