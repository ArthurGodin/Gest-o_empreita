import { cache } from "react";
import type { DeliverablePendencyInput } from "@/lib/operational-pendencies-core";
import { createClient } from "@/lib/supabase/server";
import type { ProjectDeliverableReviewAction } from "@/lib/supabase/types";

const PENDENCY_QUERY_LIMIT = 1_000;

export const getDeliverablePendencyInputs = cache(
  async (): Promise<DeliverablePendencyInput[]> => {
    const supabase = createClient();
    const [deliverablesRes, versionsRes] = await Promise.all([
      supabase
        .from("project_deliverables")
        .select("id, project_id, title")
        .is("archived_at", null)
        .limit(PENDENCY_QUERY_LIMIT),
      supabase
        .from("project_deliverable_versions")
        .select(
          `
          deliverable_id, version_number, upload_state, published_at, created_at,
          review:project_deliverable_reviews(action, created_at)
        `,
        )
        .order("version_number", { ascending: true })
        .limit(PENDENCY_QUERY_LIMIT),
    ]);

    if (deliverablesRes.error) throw deliverablesRes.error;
    if (versionsRes.error) throw versionsRes.error;

    type RawReview = {
      action: ProjectDeliverableReviewAction;
      created_at: string;
    };
    type RawVersion = {
      deliverable_id: string;
      version_number: number;
      upload_state: "pending" | "ready";
      published_at: string | null;
      created_at: string;
      review: RawReview | RawReview[] | null;
    };

    const versionsByDeliverable = new Map<string, RawVersion[]>();
    for (const version of (versionsRes.data ?? []) as unknown as RawVersion[]) {
      const versions = versionsByDeliverable.get(version.deliverable_id) ?? [];
      versions.push(version);
      versionsByDeliverable.set(version.deliverable_id, versions);
    }

    return (deliverablesRes.data ?? []).map((deliverable) => {
      const versions = versionsByDeliverable.get(deliverable.id) ?? [];
      const currentPublished =
        [...versions]
          .reverse()
          .find((version) => version.published_at !== null) ?? null;
      const currentReview = firstRelation(currentPublished?.review);
      const pendingUpload =
        versions.find(
          (version) =>
            version.published_at === null &&
            version.upload_state === "pending",
        ) ?? null;

      return {
        id: deliverable.id,
        project_id: deliverable.project_id,
        title: deliverable.title,
        current_published_at: currentPublished?.published_at ?? null,
        current_review_action: currentReview?.action ?? null,
        current_reviewed_at: currentReview?.created_at ?? null,
        pending_upload_created_at: pendingUpload?.created_at ?? null,
      };
    });
  },
);

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
