import "server-only";

import { cache } from "react";
import {
  calculateBriefingProgress,
  parseBriefingTemplateSnapshot,
  validateBriefingAnswers,
  type BriefingAnswers,
  type BriefingTemplateSnapshot,
} from "@/lib/briefings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ProjectBriefingStatus,
  Database,
} from "@/lib/supabase/types";

type BriefingRow =
  Database["public"]["Tables"]["project_briefings"]["Row"];
type BriefingRevisionRow =
  Database["public"]["Tables"]["project_briefing_revisions"]["Row"];

export interface ProjectBriefingRevision {
  id: string;
  revisionNumber: number;
  schemaVersion: number;
  snapshot: BriefingTemplateSnapshot;
  answers: BriefingAnswers;
  respondentName: string | null;
  reopenNote: string | null;
  editVersion: number;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
  dataIssue: boolean;
}

export interface ProjectBriefing {
  id: string;
  companyId: string;
  projectId: string;
  templateKey: string;
  status: ProjectBriefingStatus;
  internalNotes: string | null;
  sharedAt: string | null;
  reviewedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activeRevision: ProjectBriefingRevision;
  revisionHistory: Array<{
    id: string;
    revisionNumber: number;
    respondentName: string | null;
    submittedAt: string | null;
    createdAt: string;
  }>;
}

export interface PublicProjectBriefing {
  id: string;
  status: Extract<
    ProjectBriefingStatus,
    "shared" | "submitted" | "reviewed"
  >;
  sharedAt: string | null;
  activeRevision: ProjectBriefingRevision;
}

export const getProjectBriefing = cache(
  async (projectId: string): Promise<ProjectBriefing | null> => {
    const supabase = createClient();
    const { data: briefingData, error: briefingError } = await supabase
      .from("project_briefings")
      .select("*")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .maybeSingle();

    if (briefingError) throw briefingError;
    if (!briefingData) return null;

    const briefing = briefingData as BriefingRow;
    if (!briefing.active_revision_id) {
      throw new Error("active_briefing_revision_missing");
    }

    const { data: revisionsData, error: revisionsError } = await supabase
      .from("project_briefing_revisions")
      .select("*")
      .eq("briefing_id", briefing.id)
      .order("revision_number", { ascending: false });

    if (revisionsError) throw revisionsError;
    const rows = (revisionsData ?? []) as BriefingRevisionRow[];
    const activeRow = rows.find(
      (revision) => revision.id === briefing.active_revision_id,
    );
    if (!activeRow) throw new Error("active_briefing_revision_not_found");

    return normalizeProjectBriefing(briefing, activeRow, rows);
  },
);

export const getPublicProjectBriefingByToken = cache(
  async (shareToken: string): Promise<PublicProjectBriefing | null> => {
    if (
      !/^[A-Za-z0-9_-]{32,256}$/.test(shareToken)
    ) {
      return null;
    }

    const admin = createAdminClient();
    const { data: quoteData, error: quoteError } = await admin
      .from("quotes")
      .select("project_id,status")
      .eq("share_token", shareToken)
      .maybeSingle();

    if (
      quoteError ||
      !quoteData?.project_id ||
      quoteData.status !== "approved"
    ) {
      return null;
    }

    const { data: briefingData, error: briefingError } = await admin
      .from("project_briefings")
      .select("*")
      .eq("project_id", quoteData.project_id)
      .in("status", ["shared", "submitted", "reviewed"])
      .is("archived_at", null)
      .maybeSingle();

    if (briefingError || !briefingData?.active_revision_id) return null;

    if (briefingData.status === "shared") {
      const { data: projectState, error: projectStateError } = await admin
        .from("projects")
        .select("status,delivery_approved_at")
        .eq("id", quoteData.project_id)
        .maybeSingle();
      if (
        projectStateError ||
        !projectState ||
        projectState.status === "completed" ||
        projectState.status === "cancelled" ||
        projectState.delivery_approved_at
      ) {
        return null;
      }
    }

    const { data: revisionData, error: revisionError } = await admin
      .from("project_briefing_revisions")
      .select("*")
      .eq("id", briefingData.active_revision_id)
      .eq("briefing_id", briefingData.id)
      .maybeSingle();

    if (revisionError || !revisionData) return null;

    const activeRevision = normalizeRevision(
      revisionData as BriefingRevisionRow,
    );
    if (!activeRevision) return null;

    return {
      id: briefingData.id,
      status: briefingData.status as PublicProjectBriefing["status"],
      sharedAt: briefingData.shared_at,
      activeRevision,
    };
  },
);

function normalizeProjectBriefing(
  briefing: BriefingRow,
  activeRow: BriefingRevisionRow,
  allRows: BriefingRevisionRow[],
): ProjectBriefing {
  const activeRevision = normalizeRevision(activeRow);
  if (!activeRevision) {
    throw new Error("invalid_briefing_snapshot");
  }

  return {
    id: briefing.id,
    companyId: briefing.company_id,
    projectId: briefing.project_id,
    templateKey: briefing.template_key,
    status: briefing.status,
    internalNotes: briefing.internal_notes,
    sharedAt: briefing.shared_at,
    reviewedAt: briefing.reviewed_at,
    archivedAt: briefing.archived_at,
    createdAt: briefing.created_at,
    updatedAt: briefing.updated_at,
    activeRevision,
    revisionHistory: allRows.map((revision) => ({
      id: revision.id,
      revisionNumber: revision.revision_number,
      respondentName: revision.respondent_name,
      submittedAt: revision.submitted_at,
      createdAt: revision.created_at,
    })),
  };
}

function normalizeRevision(
  revision: BriefingRevisionRow,
): ProjectBriefingRevision | null {
  const snapshot = parseBriefingTemplateSnapshot(revision.schema_snapshot);
  if (!snapshot) return null;

  const validation = validateBriefingAnswers(snapshot, revision.answers);
  const answers = validation.ok ? validation.answers : {};

  return {
    id: revision.id,
    revisionNumber: revision.revision_number,
    schemaVersion: revision.schema_version,
    snapshot,
    answers,
    respondentName: revision.respondent_name,
    reopenNote: revision.reopen_note,
    editVersion: revision.edit_version,
    submittedAt: revision.submitted_at,
    createdAt: revision.created_at,
    updatedAt: revision.updated_at,
    progress: calculateBriefingProgress(snapshot, answers),
    dataIssue: !validation.ok,
  };
}
