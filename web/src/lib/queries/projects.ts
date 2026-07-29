import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayBR } from "@/lib/dates";
import {
  summarizeProjectCosts,
  type CostSummary,
} from "@/lib/project-cost-summary";
import type {
  ChargeKind,
  ChargeStatus,
  CostCategory,
  ProjectStatus,
  StageStatus,
} from "@/lib/supabase/types";

export interface Project {
  id: string;
  company_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  address: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
  budget_cents: number | null;
  template_id: string | null;
  progress_pct: number | null;
  last_diary_at: string | null;
  entry_pct: number | null;
  delivery_approved_at: string | null;
  delivery_approved_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem extends Project {
  customer: { id: string; name: string } | null;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  company_id: string;
  position: number;
  name: string;
  status: StageStatus;
  est_days: number | null;
  started_on: string | null;
  completed_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiaryPhoto {
  id: string;
  entry_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  position: number;
}

export interface DiaryEntry {
  id: string;
  project_id: string;
  company_id: string;
  author_id: string | null;
  body: string;
  weather: string | null;
  created_at: string;
  photos: DiaryPhoto[];
}

export interface ProjectCost {
  id: string;
  project_id: string;
  stage_id: string | null;
  category: CostCategory;
  description: string;
  amount_cents: number;
  incurred_on: string;
  created_at: string;
}

export type { CostSummary } from "@/lib/project-cost-summary";

export interface TimeEntry {
  id: string;
  project_id: string;
  worker_name: string;
  worker_role: string | null;
  worked_on: string;
  started_at: string;
  ended_at: string | null;
  hours_worked: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy_m: number | null;
  notes: string | null;
}

export interface BillingCharge {
  id: string;
  project_id: string;
  customer_id: string;
  kind: ChargeKind;
  status: ChargeStatus;
  amount_cents: number;
  payment_provider: "asaas" | "manual_pix";
  asaas_payment_id: string | null;
  pix_qr_code: string | null;
  pix_qr_image_b64: string | null;
  invoice_url: string | null;
  due_date: string | null;
  paid_at: string | null;
  paid_manually_at: string | null;
  paid_manually_by: string | null;
  manual_payment_note: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectManagementData {
  stages: ProjectStage[];
  diary: DiaryEntry[];
  diary_total: number;
  costs: ProjectCost[];
  cost_summary: CostSummary;
  time_today: TimeEntry[];
  time_history_count: number;
  charges: BillingCharge[];
  share_token: string | null;
}

export interface ProjectOverviewCharge {
  kind: ChargeKind;
  status: ChargeStatus;
  amount_cents: number;
  due_date: string | null;
}

export interface ProjectOverviewData {
  stages: ProjectStage[];
  charges: ProjectOverviewCharge[];
  diary_total: number;
}

export const getProjects = cache(
  async (options?: { limit?: number }): Promise<ProjectListItem[]> => {
    const supabase = createClient();
    let query = supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .order("created_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as unknown as ProjectListItem[];
  },
);

export const getProject = cache(
  async (id: string): Promise<ProjectListItem | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as ProjectListItem | null) ?? null;
  },
);

const DIARY_PREVIEW_LIMIT = 5;
const COST_LIST_LIMIT = 200;

export interface ProjectRevenueReference {
  revenueCents: number | null;
  shareToken: string | null;
}

export const getProjectStages = cache(
  async (projectId: string): Promise<ProjectStage[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_stages")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProjectStage[];
  },
);

export const getProjectRevenueReference = cache(
  async (projectId: string): Promise<ProjectRevenueReference> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select("total_cents,status,share_token,approved_at")
      .eq("project_id", projectId)
      .order("approved_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return {
      revenueCents:
        data?.status === "approved" ? data.total_cents ?? null : null,
      shareToken: data?.share_token ?? null,
    };
  },
);

export const getProjectOverviewData = cache(
  async (projectId: string): Promise<ProjectOverviewData> => {
    const supabase = createClient();
    const [stages, chargesResult, diaryCountResult] = await Promise.all([
      getProjectStages(projectId),
      supabase
        .from("billing_charges")
        .select("kind,status,amount_cents,due_date")
        .eq("project_id", projectId)
        .order("kind", { ascending: true }),
      supabase
        .from("diary_entries")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
    ]);

    if (chargesResult.error) throw chargesResult.error;
    if (diaryCountResult.error) throw diaryCountResult.error;

    return {
      stages,
      charges: (chargesResult.data ?? []) as ProjectOverviewCharge[],
      diary_total: diaryCountResult.count ?? 0,
    };
  },
);

export const getProjectManagementData = cache(
  async (projectId: string): Promise<ProjectManagementData> => {
    const supabase = createClient();
    const today = todayBR();
    const [
      stages,
      diaryResult,
      diaryCountResult,
      costsResult,
      costSummaryResult,
      chargesResult,
      revenue,
      timeTodayResult,
      timeHistoryResult,
    ] = await Promise.all([
      getProjectStages(projectId),
      supabase
        .from("diary_entries")
        .select("*, photos:diary_photos(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(DIARY_PREVIEW_LIMIT),
      supabase
        .from("diary_entries")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("project_costs")
        .select("*")
        .eq("project_id", projectId)
        .order("incurred_on", { ascending: false })
        .limit(COST_LIST_LIMIT),
      supabase
        .from("project_costs")
        .select("category,amount_cents")
        .eq("project_id", projectId),
      supabase
        .from("billing_charges")
        .select("*")
        .eq("project_id", projectId)
        .order("kind", { ascending: true }),
      getProjectRevenueReference(projectId),
      supabase
        .from("time_entries")
        .select("*")
        .eq("project_id", projectId)
        .eq("worked_on", today)
        .order("started_at", { ascending: true }),
      supabase
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
    ]);

    if (diaryResult.error) throw diaryResult.error;
    if (diaryCountResult.error) throw diaryCountResult.error;
    if (costsResult.error) throw costsResult.error;
    if (costSummaryResult.error) throw costSummaryResult.error;
    if (chargesResult.error) throw chargesResult.error;
    if (timeTodayResult.error) throw timeTodayResult.error;
    if (timeHistoryResult.error) throw timeHistoryResult.error;

    const costs = (costsResult.data ?? []) as ProjectCost[];

    return {
      stages,
      diary: (diaryResult.data ?? []) as unknown as DiaryEntry[],
      diary_total: diaryCountResult.count ?? 0,
      costs,
      cost_summary: summarizeProjectCosts(
        costSummaryResult.data ?? [],
        revenue.revenueCents,
      ),
      time_today: (timeTodayResult.data ?? []) as TimeEntry[],
      time_history_count: timeHistoryResult.count ?? 0,
      charges: (chargesResult.data ?? []) as BillingCharge[],
      share_token: revenue.shareToken,
    };
  },
);
