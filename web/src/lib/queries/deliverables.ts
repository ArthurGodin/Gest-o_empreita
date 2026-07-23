import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  deriveDeliverableDisplayState,
  type DeliverableDisplayState,
} from "@/lib/deliverables";
import type {
  ProjectDeliverableReviewAction,
  ProjectDeliverableSourceKind,
  ProjectDeliverableUploadState,
} from "@/lib/supabase/types";

export interface ProjectDeliverableReview {
  id: string;
  action: ProjectDeliverableReviewAction;
  signer_name: string;
  comment: string | null;
  created_at: string;
}

export interface ProjectDeliverableVersion {
  id: string;
  company_id: string;
  project_id: string;
  deliverable_id: string;
  version_number: number;
  source_kind: ProjectDeliverableSourceKind;
  upload_state: ProjectDeliverableUploadState;
  storage_path: string | null;
  external_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  expected_size_bytes: number | null;
  size_bytes: number | null;
  change_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  review: ProjectDeliverableReview | null;
}

export interface ProjectDeliverable {
  id: string;
  company_id: string;
  project_id: string;
  stage_id: string | null;
  title: string;
  description: string | null;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  stage: { id: string; name: string } | null;
  versions: ProjectDeliverableVersion[];
  currentPublishedVersion: ProjectDeliverableVersion | null;
  draftVersion: ProjectDeliverableVersion | null;
  state: DeliverableDisplayState;
  lastActivityAt: string;
}

export interface ProjectDeliveryAcceptance {
  id: string;
  project_id: string;
  signer_name: string;
  accepted_at: string;
}

export interface DeliverableStorageUsage {
  usedBytes: number;
  pendingBytes: number;
  readyBytes: number;
}

type RawReview = ProjectDeliverableReview;
type RawVersion = Omit<ProjectDeliverableVersion, "review"> & {
  review: RawReview | RawReview[] | null;
};
type RawDeliverable = Omit<
  ProjectDeliverable,
  | "stage"
  | "versions"
  | "currentPublishedVersion"
  | "draftVersion"
  | "state"
  | "lastActivityAt"
> & {
  stage:
    | { id: string; name: string }
    | Array<{ id: string; name: string }>
    | null;
  versions: RawVersion[] | null;
};

export const getProjectDeliverables = cache(
  async (projectId: string): Promise<ProjectDeliverable[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_deliverables")
      .select(
        `
        id, company_id, project_id, stage_id, title, description, position,
        archived_at, created_at, updated_at,
        stage:project_stages(id, name),
        versions:project_deliverable_versions(
          id, company_id, project_id, deliverable_id, version_number,
          source_kind, upload_state, storage_path, external_url, file_name,
          mime_type, expected_size_bytes, size_bytes, change_note,
          published_at, created_at, updated_at,
          review:project_deliverable_reviews(
            id, action, signer_name, comment, created_at
          )
        )
      `,
      )
      .eq("project_id", projectId)
      .order("position", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as unknown as RawDeliverable[]).map(
      normalizeDeliverable,
    );
  },
);

export const getDeliverableStorageUsage = cache(
  async (companyId: string): Promise<DeliverableStorageUsage> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_deliverable_versions")
      .select("upload_state, expected_size_bytes, size_bytes")
      .eq("company_id", companyId)
      .eq("source_kind", "file");

    if (error) throw error;

    let pendingBytes = 0;
    let readyBytes = 0;
    for (const row of data ?? []) {
      if (row.upload_state === "ready") {
        readyBytes += row.size_bytes ?? row.expected_size_bytes ?? 0;
      } else {
        pendingBytes += row.expected_size_bytes ?? 0;
      }
    }

    return {
      usedBytes: pendingBytes + readyBytes,
      pendingBytes,
      readyBytes,
    };
  },
);

export const getProjectDeliveryAcceptance = cache(
  async (projectId: string): Promise<ProjectDeliveryAcceptance | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_delivery_acceptances")
      .select("id, project_id, signer_name, accepted_at")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) throw error;
    return (data as ProjectDeliveryAcceptance | null) ?? null;
  },
);

function normalizeDeliverable(raw: RawDeliverable): ProjectDeliverable {
  const versions = (raw.versions ?? [])
    .map((version) => ({
      ...version,
      review: firstRelation(version.review),
    }))
    .sort((a, b) => a.version_number - b.version_number);

  const currentPublishedVersion =
    [...versions]
      .reverse()
      .find((version) => version.published_at !== null) ?? null;
  const draftVersion =
    versions.find((version) => version.published_at === null) ?? null;
  const state = deriveDeliverableDisplayState({
    archivedAt: raw.archived_at,
    currentPublishedVersion: currentPublishedVersion
      ? { reviewAction: currentPublishedVersion.review?.action ?? null }
      : null,
  });

  const lastActivityAt = [
    raw.updated_at,
    draftVersion?.updated_at,
    currentPublishedVersion?.published_at,
    currentPublishedVersion?.review?.created_at,
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? raw.updated_at;

  return {
    ...raw,
    stage: firstRelation(raw.stage),
    versions,
    currentPublishedVersion,
    draftVersion,
    state,
    lastActivityAt,
  };
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
