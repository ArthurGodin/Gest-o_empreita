import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const ACTIVATION_QUERY_LIMIT = 1_000;

export interface ActivationMilestones {
  stageProjectIds: string[];
  briefings: Array<{
    projectId: string;
    sharedAt: string | null;
  }>;
  deliverableProjectIds: string[];
  managementProjectIds: string[];
}

export const getActivationMilestones = cache(
  async (): Promise<ActivationMilestones> => {
    const supabase = createClient();
    const [stages, briefings, deliverables, diary, costs] = await Promise.all([
      supabase
        .from("project_stages")
        .select("project_id")
        .limit(ACTIVATION_QUERY_LIMIT),
      supabase
        .from("project_briefings")
        .select("project_id, shared_at")
        .is("archived_at", null)
        .limit(ACTIVATION_QUERY_LIMIT),
      supabase
        .from("project_deliverables")
        .select("project_id")
        .is("archived_at", null)
        .limit(ACTIVATION_QUERY_LIMIT),
      supabase
        .from("diary_entries")
        .select("project_id")
        .limit(ACTIVATION_QUERY_LIMIT),
      supabase
        .from("project_costs")
        .select("project_id")
        .limit(ACTIVATION_QUERY_LIMIT),
    ]);

    const error =
      stages.error ??
      briefings.error ??
      deliverables.error ??
      diary.error ??
      costs.error;
    if (error) throw error;

    return {
      stageProjectIds: uniqueProjectIds(stages.data),
      briefings: (briefings.data ?? []).map((briefing) => ({
        projectId: briefing.project_id,
        sharedAt: briefing.shared_at,
      })),
      deliverableProjectIds: uniqueProjectIds(deliverables.data),
      managementProjectIds: uniqueProjectIds([
        ...(diary.data ?? []),
        ...(costs.data ?? []),
      ]),
    };
  },
);

function uniqueProjectIds(rows: Array<{ project_id: string }> | null) {
  return [...new Set((rows ?? []).map((row) => row.project_id))];
}
