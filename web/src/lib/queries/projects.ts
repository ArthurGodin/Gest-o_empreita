import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { todayBR } from "@/lib/dates";
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

export interface CostSummary {
  by_category: Record<CostCategory, number>;
  total_cents: number;
  revenue_cents: number | null;
  margin_cents: number | null;
  margin_pct: number | null;
}

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
  asaas_payment_id: string | null;
  pix_qr_code: string | null;
  pix_qr_image_b64: string | null;
  invoice_url: string | null;
  due_date: string | null;
  paid_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRelations extends ProjectListItem {
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

export const getProjects = cache(async (): Promise<ProjectListItem[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, customer:customers(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProjectListItem[];
});

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

/**
 * Busca o projeto + 6 relações em paralelo. Retorna null se o projeto
 * não pertencer ao tenant ou não existir.
 *
 * Usado pelo painel da obra (RSC) — uma chamada cobre tudo que a tela
 * precisa renderizar de primeira.
 */
export const getProjectWithRelations = cache(
  async (id: string): Promise<ProjectWithRelations | null> => {
    const supabase = createClient();

    const projectRes = await supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .eq("id", id)
      .maybeSingle();

    if (projectRes.error) throw projectRes.error;
    if (!projectRes.data) return null;

    const project = projectRes.data as unknown as ProjectListItem;
    const today = todayBR();

    const [
      stagesRes,
      diaryRes,
      diaryCountRes,
      costsRes,
      chargesRes,
      revenueRes,
      timeTodayRes,
      timeHistoryRes,
    ] = await Promise.all([
      supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("diary_entries")
        .select("*, photos:diary_photos(*)")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(DIARY_PREVIEW_LIMIT),
      supabase
        .from("diary_entries")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
      supabase
        .from("project_costs")
        .select("*")
        .eq("project_id", id)
        .order("incurred_on", { ascending: false })
        .limit(COST_LIST_LIMIT),
      supabase
        .from("billing_charges")
        .select("*")
        .eq("project_id", id)
        .order("kind", { ascending: true }),
      supabase
        .from("quotes")
        .select("total_cents,status,share_token,approved_at")
        .eq("project_id", id)
        .order("approved_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("time_entries")
        .select("*")
        .eq("project_id", id)
        .eq("worked_on", today)
        .order("started_at", { ascending: true }),
      supabase
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id),
    ]);

    if (stagesRes.error) throw stagesRes.error;
    if (diaryRes.error) throw diaryRes.error;
    if (diaryCountRes.error) throw diaryCountRes.error;
    if (costsRes.error) throw costsRes.error;
    if (chargesRes.error) throw chargesRes.error;
    if (revenueRes.error) throw revenueRes.error;
    if (timeTodayRes.error) throw timeTodayRes.error;
    if (timeHistoryRes.error) throw timeHistoryRes.error;

    const stages = (stagesRes.data ?? []) as ProjectStage[];
    const diary = (diaryRes.data ?? []) as unknown as DiaryEntry[];
    const costs = (costsRes.data ?? []) as ProjectCost[];
    const quoteRow = revenueRes.data as
      | {
          total_cents: number | null;
          status: string | null;
          share_token: string | null;
        }
      | null;
    // Revenue só conta se quote estiver aprovado (não cancela margem em draft)
    const revenueCents =
      quoteRow?.status === "approved" ? quoteRow?.total_cents ?? null : null;

    const costSummary = summarizeCosts(costs, revenueCents);

    return {
      ...project,
      stages,
      diary,
      diary_total: diaryCountRes.count ?? 0,
      costs,
      cost_summary: costSummary,
      time_today: (timeTodayRes.data ?? []) as TimeEntry[],
      time_history_count: timeHistoryRes.count ?? 0,
      charges: (chargesRes.data ?? []) as BillingCharge[],
      share_token: quoteRow?.share_token ?? null,
    };
  },
);

function summarizeCosts(
  costs: ProjectCost[],
  revenueCents: number | null,
): CostSummary {
  const byCategory: Record<CostCategory, number> = {
    material: 0,
    labor: 0,
    freight: 0,
    other: 0,
  };
  let total = 0;
  for (const c of costs) {
    byCategory[c.category] += c.amount_cents;
    total += c.amount_cents;
  }

  const margin = revenueCents == null ? null : revenueCents - total;
  const marginPct =
    revenueCents == null || revenueCents === 0
      ? null
      : Math.round(((revenueCents - total) / revenueCents) * 10000) / 100;

  return {
    by_category: byCategory,
    total_cents: total,
    revenue_cents: revenueCents,
    margin_cents: margin,
    margin_pct: marginPct,
  };
}
