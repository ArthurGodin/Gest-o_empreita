import { env } from "@/lib/env";
import { hasProfessionalProjectTools } from "./project-workspace";
import type { ProjectWorkspaceView } from "./project-workspace";
import type { CompanyFull } from "@/lib/queries/company-settings";
import {
  getDeliverableStorageUsage,
  getProjectDeliverables,
  getProjectDeliveryAcceptance,
} from "@/lib/queries/deliverables";
import { getProjectBriefing } from "@/lib/queries/briefings";
import { getProjectSpaces } from "@/lib/queries/project-spaces";
import {
  getProjectManagementData,
  getProjectOverviewData,
  getProjectRevenueReference,
  getProjectStages,
  type ProjectListItem,
} from "@/lib/queries/projects";
import { listTemplates } from "@/lib/queries/stage-templates";
import { BillingSection } from "./billing-section";
import { BriefingSection } from "./briefing-section";
import { CostsSection } from "./costs-section";
import { DeliverablesSection } from "./deliverables-section";
import { DiarySection } from "./diary-section";
import { ProjectManagementNav } from "./project-management-nav";
import { ProjectWorkspaceOverview } from "./project-workspace-overview";
import { PublicLinkCallout } from "./public-link-callout";
import { SpacesSection } from "./spaces-section";
import { StagesSection } from "./stages-section";
import { StatusSuggestion } from "./status-suggestion";
import { TimeSection } from "./time-section";

const sectionAnchorClass =
  "min-w-0 scroll-mt-[calc(9.5rem+env(safe-area-inset-top))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:scroll-mt-24";

interface ProjectWorkspaceContentProps {
  activeView: ProjectWorkspaceView;
  company: CompanyFull | null;
  conversionBillingAttention: boolean;
  project: ProjectListItem;
}

export async function ProjectWorkspaceContent({
  activeView,
  company,
  conversionBillingAttention,
  project,
}: ProjectWorkspaceContentProps) {
  const segment = company?.business_segment ?? "construction";
  const plan = company?.plan ?? "free";
  const isDemoWorkspace = company?.workspace_mode === "demo";
  const projectLocked =
    project.status === "completed" ||
    project.status === "cancelled" ||
    Boolean(project.delivery_approved_at);

  switch (activeView) {
    case "briefing": {
      const [briefing, spaces, revenue] = await Promise.all([
        getProjectBriefing(project.id),
        getProjectSpaces(project.id),
        getProjectRevenueReference(project.id),
      ]);
      const publicUrl = revenue.shareToken
        ? `${env.NEXT_PUBLIC_APP_URL}/q/${revenue.shareToken}?tab=briefing`
        : null;

      return (
        <BriefingSection
          key={`${briefing?.activeRevision.id ?? "none"}:${spaces
            .map((space) => space.id)
            .join(",")}`}
          projectId={project.id}
          plan={plan}
          segment={segment}
          briefing={briefing}
          spaces={spaces}
          publicUrl={publicUrl}
          projectLocked={projectLocked}
        />
      );
    }

    case "ambientes": {
      const spaces = await getProjectSpaces(project.id);
      return (
        <SpacesSection
          projectId={project.id}
          plan={plan}
          spaces={spaces}
          projectLocked={projectLocked}
        />
      );
    }

    case "etapas": {
      const [stages, templates] = await Promise.all([
        getProjectStages(project.id),
        listTemplates(),
      ]);
      return (
        <div className="space-y-4">
          <StatusSuggestion
            projectId={project.id}
            current={project.status}
            stages={stages}
          />
          <StagesSection
            projectId={project.id}
            stages={stages}
            progressPct={project.progress_pct}
            startsOn={project.starts_on}
            templates={templates}
          />
        </div>
      );
    }

    case "entregas": {
      const [deliverables, acceptance, stages, revenue, storageUsage] =
        await Promise.all([
          getProjectDeliverables(project.id),
          getProjectDeliveryAcceptance(project.id),
          getProjectStages(project.id),
          getProjectRevenueReference(project.id),
          company
            ? getDeliverableStorageUsage(company.id)
            : Promise.resolve({
                usedBytes: 0,
                pendingBytes: 0,
                readyBytes: 0,
              }),
        ]);

      return (
        <DeliverablesSection
          projectId={project.id}
          shareToken={revenue.shareToken}
          plan={plan}
          projectLocked={projectLocked}
          stages={stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
          }))}
          deliverables={deliverables}
          storageUsage={storageUsage}
          acceptance={acceptance}
        />
      );
    }

    case "gestao": {
      const management = await getProjectManagementData(project.id);

      return (
        <div className="space-y-4">
          <ProjectManagementNav />

          <BillingSection
            charges={management.charges}
            businessSegment={segment}
            isDemoWorkspace={isDemoWorkspace}
            projectStatus={project.status}
            budgetCents={project.budget_cents}
            deliveryApprovedAt={project.delivery_approved_at}
            conversionBillingAttention={conversionBillingAttention}
          />

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.85fr)]">
            <div id="diario" tabIndex={-1} className={sectionAnchorClass}>
              <DiarySection
                projectId={project.id}
                entries={management.diary}
                total={management.diary_total}
              />
            </div>
            <div id="custos" tabIndex={-1} className={sectionAnchorClass}>
              <CostsSection
                projectId={project.id}
                costs={management.costs}
                summary={management.cost_summary}
                stages={management.stages}
              />
            </div>
          </div>

          <div id="equipe" tabIndex={-1} className={sectionAnchorClass}>
            <TimeSection
              projectId={project.id}
              today={management.time_today}
              historyCount={management.time_history_count}
            />
          </div>

          <PublicLinkCallout shareToken={management.share_token} />
        </div>
      );
    }

    case "resumo":
    default: {
      const professionalTools = hasProfessionalProjectTools(segment);
      const [overview, briefing, spaces, deliverables] = await Promise.all([
        getProjectOverviewData(project.id),
        professionalTools
          ? getProjectBriefing(project.id)
          : Promise.resolve(null),
        professionalTools ? getProjectSpaces(project.id) : Promise.resolve([]),
        getProjectDeliverables(project.id),
      ]);

      return (
        <div className="space-y-4">
          <StatusSuggestion
            projectId={project.id}
            current={project.status}
            stages={overview.stages}
          />
          <ProjectWorkspaceOverview
            briefing={briefing}
            deliverables={deliverables}
            isDemoWorkspace={isDemoWorkspace}
            overview={overview}
            project={project}
            segment={segment}
            spaces={spaces}
          />
        </div>
      );
    }
  }
}
