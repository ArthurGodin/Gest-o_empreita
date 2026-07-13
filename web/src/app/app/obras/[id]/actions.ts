"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import {
  clientErrorFor,
  logServerError,
  logServerEvent,
  logServerWarning,
} from "@/lib/log";
import { deleteDiaryPhotos } from "@/lib/supabase/storage";
import { canTransitionStatus } from "@/lib/project-status";
import { todayBR } from "@/lib/dates";
import { markManualPixChargePaid } from "@/lib/billing/manual-pix";
import { generatePreferredPixForCharge } from "@/lib/billing/provider";
import type {
  CostCategory,
  Database,
  ProjectStatus,
  StageStatus,
} from "@/lib/supabase/types";

type StageUpdate = Database["public"]["Tables"]["project_stages"]["Update"];
type CostUpdate = Database["public"]["Tables"]["project_costs"]["Update"];
type TimeUpdate = Database["public"]["Tables"]["time_entries"]["Update"];

export type StageActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type SimpleActionResult =
  | { ok: true }
  | { ok: false; error: string };

// ─── Schemas ───────────────────────────────────────────────────────────────

const stageNameSchema = z
  .string()
  .trim()
  .min(1, "Nome da etapa não pode ser vazio")
  .max(200, "Nome muito longo (máx 200 caracteres)");

const estDaysSchema = z
  .number()
  .int()
  .min(1, "Mínimo 1 dia")
  .max(365, "Máximo 365 dias")
  .optional()
  .nullable();

const updateStageSchema = z.object({
  name: stageNameSchema.optional(),
  est_days: estDaysSchema,
  notes: z
    .string()
    .trim()
    .max(2000, "Anotações muito longas (máx 2000 caracteres)")
    .optional()
    .or(z.literal("")),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

async function requireCompany(): Promise<
  | { ok: true; companyId: string }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };
  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };
  return { ok: true, companyId: company.company_id };
}

async function ensureProjectInCompany(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  companyId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();
  return !!data;
}

async function ensureStageInCompany(
  supabase: ReturnType<typeof createClient>,
  stageId: string,
  companyId: string,
): Promise<{ project_id: string; status: StageStatus } | null> {
  const { data } = await supabase
    .from("project_stages")
    .select("project_id, status")
    .eq("id", stageId)
    .eq("company_id", companyId)
    .maybeSingle();
  return (data as unknown as { project_id: string; status: StageStatus } | null) ?? null;
}

// ─── addStage ──────────────────────────────────────────────────────────────

export async function addStageAction(
  projectId: string,
  name: string,
  estDays: number | null = null,
): Promise<StageActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = z
    .object({ name: stageNameSchema, est_days: estDaysSchema })
    .safeParse({ name, est_days: estDays });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();

  if (!(await ensureProjectInCompany(supabase, projectId, auth.companyId))) {
    return { ok: false, error: "Obra não encontrada." };
  }

  const { data: maxRow } = await supabase
    .from("project_stages")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = ((maxRow?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("project_stages")
    .insert({
      project_id: projectId,
      company_id: auth.companyId,
      position: nextPosition,
      name: parsed.data.name,
      est_days: parsed.data.est_days ?? null,
      status: "todo",
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("obras.stages.add", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true, id: data.id as string };
}

// ─── updateStage ───────────────────────────────────────────────────────────

export async function updateStageAction(
  stageId: string,
  patch: { name?: string; est_days?: number | null; notes?: string },
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = updateStageSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const supabase = createClient();
  const existing = await ensureStageInCompany(supabase, stageId, auth.companyId);
  if (!existing) return { ok: false, error: "Etapa não encontrada." };

  const update: StageUpdate = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.est_days !== undefined) update.est_days = parsed.data.est_days;
  if (parsed.data.notes !== undefined) {
    update.notes = parsed.data.notes === "" ? null : parsed.data.notes;
  }

  if (Object.keys(update).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("project_stages")
    .update(update)
    .eq("id", stageId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.stages.update", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${existing.project_id}`);
  return { ok: true };
}

// ─── setStageStatus ────────────────────────────────────────────────────────

const STAGE_STATUSES = ["todo", "in_progress", "done"] as const;

export async function setStageStatusAction(
  stageId: string,
  status: StageStatus,
): Promise<SimpleActionResult> {
  if (!STAGE_STATUSES.includes(status)) {
    return { ok: false, error: "Status inválido." };
  }

  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const existing = await ensureStageInCompany(supabase, stageId, auth.companyId);
  if (!existing) return { ok: false, error: "Etapa não encontrada." };

  const today = todayBR();
  const update: StageUpdate = { status };

  if (status === "in_progress") {
    // Rebaixa qualquer outra etapa em execução do mesmo project para 'todo'
    const { error: demoteErr } = await supabase
      .from("project_stages")
      .update({ status: "todo" })
      .eq("project_id", existing.project_id)
      .eq("status", "in_progress")
      .neq("id", stageId);
    if (demoteErr) {
      logServerError("obras.stages.demote", demoteErr);
      return { ok: false, error: clientErrorFor(demoteErr) };
    }
    update.started_on = today; // sobrescreve se já tinha — caller pode editar depois
    update.completed_on = null;
  } else if (status === "done") {
    update.completed_on = today;
  } else {
    // todo: limpa marcações
    update.completed_on = null;
  }

  const { error } = await supabase
    .from("project_stages")
    .update(update)
    .eq("id", stageId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.stages.set-status", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  if (status === "in_progress" || status === "done") {
    const { error: projectStatusError } = await supabase
      .from("projects")
      .update({ status: "in_progress" })
      .eq("id", existing.project_id)
      .eq("company_id", auth.companyId)
      .eq("status", "planning");

    if (projectStatusError) {
      logServerError("obras.stages.auto-project-status", projectStatusError);
    }
  }

  revalidatePath(`/app/obras/${existing.project_id}`);
  return { ok: true };
}

// ─── reorderStages ─────────────────────────────────────────────────────────

export async function reorderStagesAction(
  projectId: string,
  orderedIds: string[],
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const ids = z.array(z.string().uuid()).min(1).max(100).safeParse(orderedIds);
  if (!ids.success) return { ok: false, error: "Ordem inválida." };

  const supabase = createClient();

  if (!(await ensureProjectInCompany(supabase, projectId, auth.companyId))) {
    return { ok: false, error: "Obra não encontrada." };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("project_stages")
    .select("id")
    .eq("project_id", projectId);

  if (fetchErr) {
    logServerError("obras.stages.reorder.fetch", fetchErr);
    return { ok: false, error: clientErrorFor(fetchErr) };
  }

  const existingIds = new Set((existing ?? []).map((r) => r.id as string));
  const newIds = new Set(ids.data);
  if (existingIds.size !== newIds.size) {
    return { ok: false, error: "Lista de etapas inconsistente." };
  }
  for (const id of ids.data) {
    if (!existingIds.has(id)) {
      return { ok: false, error: "Etapa desconhecida na nova ordem." };
    }
  }

  // Estratégia simples pra contornar unique(project_id, position):
  // 1) bump todas pra position + 1000 (fora de banda)
  // 2) atualiza pra position final 0..N-1
  // Sem transação real do client, mas as constraints garantem que mesmo se
  // falhar no meio, ninguém fica num estado quebrado (positions altas são
  // válidas, só não-canônicas).
  const bumpUpdates = ids.data.map((id, idx) =>
    supabase
      .from("project_stages")
      .update({ position: 1000 + idx })
      .eq("id", id)
      .eq("company_id", auth.companyId),
  );
  const bumpResults = await Promise.all(bumpUpdates);
  for (const r of bumpResults) {
    if (r.error) {
      logServerError("obras.stages.reorder.bump", r.error);
      return { ok: false, error: clientErrorFor(r.error) };
    }
  }

  const finalUpdates = ids.data.map((id, idx) =>
    supabase
      .from("project_stages")
      .update({ position: idx })
      .eq("id", id)
      .eq("company_id", auth.companyId),
  );
  const finalResults = await Promise.all(finalUpdates);
  for (const r of finalResults) {
    if (r.error) {
      logServerError("obras.stages.reorder.final", r.error);
      return { ok: false, error: clientErrorFor(r.error) };
    }
  }

  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true };
}

// ─── deleteStage ───────────────────────────────────────────────────────────

export async function deleteStageAction(
  stageId: string,
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const existing = await ensureStageInCompany(supabase, stageId, auth.companyId);
  if (!existing) return { ok: false, error: "Etapa não encontrada." };

  if (existing.status !== "todo") {
    return {
      ok: false,
      error:
        "Só dá pra apagar etapas que ainda estão em 'a fazer'. Volta o status pra 'a fazer' antes.",
    };
  }

  const { error } = await supabase
    .from("project_stages")
    .delete()
    .eq("id", stageId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.stages.delete", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${existing.project_id}`);
  return { ok: true };
}

// ─── applyTemplate ─────────────────────────────────────────────────────────

export type ApplyTemplateResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string };

export async function applyTemplateAction(
  projectId: string,
  templateId: string,
): Promise<ApplyTemplateResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const idsOk = z
    .object({ projectId: z.string().uuid(), templateId: z.string().uuid() })
    .safeParse({ projectId, templateId });

  if (!idsOk.success) return { ok: false, error: "IDs inválidos." };

  const supabase = createClient();

  if (!(await ensureProjectInCompany(supabase, projectId, auth.companyId))) {
    return { ok: false, error: "Obra não encontrada." };
  }

  // Rejeita se já existem etapas (UI deve oferecer "apagar todas primeiro")
  const { count: existingCount, error: countErr } = await supabase
    .from("project_stages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (countErr) {
    logServerError("obras.stages.apply.count", countErr);
    return { ok: false, error: clientErrorFor(countErr) };
  }

  if ((existingCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Essa obra já tem etapas. Apague todas primeiro pra aplicar um template.",
    };
  }

  const { data, error } = await supabase.rpc("instantiate_template_stages", {
    p_project_id: projectId,
    p_company_id: auth.companyId,
    p_template_id: templateId,
  });

  if (error) {
    logServerError("obras.stages.apply.rpc", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true, inserted: (data as number) ?? 0 };
}

// ─── createDiaryEntry ──────────────────────────────────────────────────────

const diaryPhotoSchema = z.object({
  storage_path: z.string().min(1).max(500),
  width: z.number().int().min(1).max(10000).optional().nullable(),
  height: z.number().int().min(1).max(10000).optional().nullable(),
  size_bytes: z.number().int().min(1).max(5_242_880),
  position: z.number().int().min(0).max(100).optional(),
});

const createDiarySchema = z.object({
  body: z
    .string()
    .trim()
    .max(2000, "Texto muito longo (máx 2000 caracteres)")
    .optional()
    .or(z.literal("")),
  photos: z.array(diaryPhotoSchema).max(20, "Máximo 20 fotos por entrada"),
});

export type DiaryActionResult =
  | { ok: true; entry_id: string }
  | { ok: false; error: string };

export async function createDiaryEntryAction(
  projectId: string,
  body: string,
  photos: Array<{
    storage_path: string;
    width?: number | null;
    height?: number | null;
    size_bytes: number;
    position?: number;
  }>,
): Promise<DiaryActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = createDiarySchema.safeParse({ body, photos });
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos." };
  }

  const trimmedBody = (parsed.data.body ?? "").trim();
  if (trimmedBody.length === 0 && parsed.data.photos.length === 0) {
    return {
      ok: false,
      error: "Adicione texto ou pelo menos uma foto.",
    };
  }

  const supabase = createClient();

  if (!(await ensureProjectInCompany(supabase, projectId, auth.companyId))) {
    return { ok: false, error: "Obra não encontrada." };
  }

  const { data, error } = await supabase.rpc("insert_diary_entry", {
    p_project_id: projectId,
    p_company_id: auth.companyId,
    p_body: trimmedBody,
    p_photos: parsed.data.photos,
  });

  if (error) {
    logServerError("obras.diary.create", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true, entry_id: data as string };
}

// ─── deleteDiaryEntry ──────────────────────────────────────────────────────

export async function deleteDiaryEntryAction(
  entryId: string,
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const { data: entry, error: fetchErr } = await supabase
    .from("diary_entries")
    .select("project_id, photos:diary_photos(storage_path)")
    .eq("id", entryId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (fetchErr) {
    logServerError("obras.diary.delete.fetch", fetchErr);
    return { ok: false, error: clientErrorFor(fetchErr) };
  }
  if (!entry) return { ok: false, error: "Entrada não encontrada." };

  const e = entry as unknown as {
    project_id: string;
    photos: { storage_path: string }[];
  };
  const paths = (e.photos ?? []).map((p) => p.storage_path);

  // Apaga DB primeiro (CASCADE em diary_photos) — Storage é cleanup
  const { error: delErr } = await supabase
    .from("diary_entries")
    .delete()
    .eq("id", entryId)
    .eq("company_id", auth.companyId);

  if (delErr) {
    logServerError("obras.diary.delete.row", delErr);
    return { ok: false, error: clientErrorFor(delErr) };
  }

  // Cleanup do Storage com admin client (silent fail — vira lixo se falhar,
  // mas o registro do DB já foi). Cron de limpeza pega depois.
  if (paths.length > 0) {
    try {
      await deleteDiaryPhotos(paths);
    } catch (storageErr) {
      logServerError("obras.diary.delete.storage", storageErr);
    }
  }

  revalidatePath(`/app/obras/${e.project_id}`);
  return { ok: true };
}

// ─── Custos ────────────────────────────────────────────────────────────────

const COST_CATEGORIES = ["material", "labor", "freight", "other"] as const;

const costSchema = z.object({
  category: z.enum(COST_CATEGORIES),
  description: z
    .string()
    .trim()
    .min(1, "Descrição vazia")
    .max(200, "Descrição muito longa (máx 200 caracteres)"),
  amount_cents: z
    .number()
    .int()
    .min(1, "Valor deve ser maior que zero")
    .max(100_000_000, "Valor muito alto"),
  stage_id: z.string().uuid().optional().nullable(),
  incurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .optional(),
});

export type CostActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function addCostAction(
  projectId: string,
  payload: {
    category: CostCategory;
    description: string;
    amount_cents: number;
    stage_id?: string | null;
    incurred_on?: string;
  },
): Promise<CostActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = costSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Dados inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  if (!(await ensureProjectInCompany(supabase, projectId, auth.companyId))) {
    return { ok: false, error: "Obra não encontrada." };
  }

  // Se stage_id, valida que pertence ao mesmo projeto + tenant
  if (parsed.data.stage_id) {
    const { data: stage } = await supabase
      .from("project_stages")
      .select("project_id")
      .eq("id", parsed.data.stage_id)
      .eq("company_id", auth.companyId)
      .maybeSingle();
    if (!stage || stage.project_id !== projectId) {
      return { ok: false, error: "Etapa inválida pra essa obra." };
    }
  }

  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("project_costs")
    .insert({
      project_id: projectId,
      company_id: auth.companyId,
      stage_id: parsed.data.stage_id ?? null,
      category: parsed.data.category,
      description: parsed.data.description,
      amount_cents: parsed.data.amount_cents,
      incurred_on: parsed.data.incurred_on ?? todayBR(),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("obras.costs.add", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true, id: data.id as string };
}

const updateCostSchema = costSchema.partial();

export async function updateCostAction(
  costId: string,
  patch: Partial<{
    category: CostCategory;
    description: string;
    amount_cents: number;
    stage_id: string | null;
    incurred_on: string;
  }>,
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = updateCostSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("project_costs")
    .select("project_id")
    .eq("id", costId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Gasto não encontrado." };

  const update: CostUpdate = {};
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.amount_cents !== undefined) update.amount_cents = parsed.data.amount_cents;
  if (parsed.data.stage_id !== undefined) update.stage_id = parsed.data.stage_id;
  if (parsed.data.incurred_on !== undefined) update.incurred_on = parsed.data.incurred_on;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("project_costs")
    .update(update)
    .eq("id", costId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.costs.update", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${existing.project_id}`);
  return { ok: true };
}

export async function deleteCostAction(
  costId: string,
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("project_costs")
    .select("project_id")
    .eq("id", costId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Gasto não encontrado." };

  const { error } = await supabase
    .from("project_costs")
    .delete()
    .eq("id", costId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.costs.delete", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${existing.project_id}`);
  return { ok: true };
}

// ─── Ponto (time_entries) ──────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const timeEntrySchema = z.object({
  worker_name: z
    .string()
    .trim()
    .min(1, "Nome do peão é obrigatório")
    .max(100, "Nome muito longo"),
  worker_role: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal("")),
  started_at: z.string().regex(timeRegex, "Hora de entrada inválida (HH:MM)"),
  ended_at: z
    .string()
    .regex(timeRegex, "Hora de saída inválida (HH:MM)")
    .optional()
    .or(z.literal("")),
  worked_on: z
    .string()
    .regex(dateRegex, "Data inválida")
    .optional(),
  gps_lat: z.number().min(-90).max(90).optional().nullable(),
  gps_lng: z.number().min(-180).max(180).optional().nullable(),
  gps_accuracy_m: z.number().int().min(0).max(100_000).optional().nullable(),
  notes: z
    .string()
    .trim()
    .max(500, "Notas muito longas (máx 500 caracteres)")
    .optional()
    .or(z.literal("")),
});

function calcHoursWorked(started: string, ended: string): number {
  const [h1, m1] = started.split(":").map(Number) as [number, number];
  const [h2, m2] = ended.split(":").map(Number) as [number, number];
  const mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins <= 0) return 0;
  return Math.round((mins / 60) * 100) / 100;
}

export type TimeActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function addTimeEntryAction(
  projectId: string,
  payload: {
    worker_name: string;
    worker_role?: string;
    started_at: string;
    ended_at?: string;
    worked_on?: string;
    gps_lat?: number | null;
    gps_lng?: number | null;
    gps_accuracy_m?: number | null;
    notes?: string;
  },
): Promise<TimeActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = timeEntrySchema.safeParse(payload);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Dados inválidos." };
  }

  const supabase = createClient();
  if (!(await ensureProjectInCompany(supabase, projectId, auth.companyId))) {
    return { ok: false, error: "Obra não encontrada." };
  }

  const endedAt = parsed.data.ended_at === "" ? null : parsed.data.ended_at;
  const hours =
    endedAt && parsed.data.started_at
      ? calcHoursWorked(parsed.data.started_at, endedAt)
      : null;

  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      project_id: projectId,
      company_id: auth.companyId,
      worker_name: parsed.data.worker_name,
      worker_role: (parsed.data.worker_role ?? "") === "" ? null : parsed.data.worker_role!,
      worked_on: parsed.data.worked_on ?? todayBR(),
      started_at: parsed.data.started_at,
      ended_at: endedAt,
      hours_worked: hours,
      gps_lat: parsed.data.gps_lat ?? null,
      gps_lng: parsed.data.gps_lng ?? null,
      gps_accuracy_m: parsed.data.gps_accuracy_m ?? null,
      notes: (parsed.data.notes ?? "") === "" ? null : parsed.data.notes!,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("obras.time.add", error);
    if (error?.code === "23505") {
      return {
        ok: false,
        error: `Já existe um ponto fechado de ${parsed.data.worker_name} nessa data. Edite o existente em vez de criar outro.`,
      };
    }
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${projectId}`);
  return { ok: true, id: data.id as string };
}

export async function endTimeEntryAction(
  timeId: string,
  endedAt: string,
): Promise<SimpleActionResult> {
  if (!timeRegex.test(endedAt)) {
    return { ok: false, error: "Hora de saída inválida." };
  }

  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("time_entries")
    .select("project_id, started_at, ended_at")
    .eq("id", timeId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Ponto não encontrado." };
  const e = existing as { project_id: string; started_at: string; ended_at: string | null };
  if (e.ended_at) {
    return { ok: false, error: "Esse ponto já está fechado." };
  }

  const hours = calcHoursWorked(e.started_at.slice(0, 5), endedAt);

  const { error } = await supabase
    .from("time_entries")
    .update({
      ended_at: endedAt,
      hours_worked: hours,
    } satisfies TimeUpdate)
    .eq("id", timeId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.time.end", error);
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Já existe outro ponto fechado desse peão nessa data.",
      };
    }
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${e.project_id}`);
  return { ok: true };
}

export async function deleteTimeEntryAction(
  timeId: string,
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("time_entries")
    .select("project_id")
    .eq("id", timeId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Ponto não encontrado." };

  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", timeId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.time.delete", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath(`/app/obras/${existing.project_id}`);
  return { ok: true };
}

/**
 * Autocomplete de nomes de peões já usados pela empresa.
 * Server action chamada do client com debounce.
 */
export async function workerNamesAutocompleteAction(
  query: string,
): Promise<string[]> {
  const auth = await requireCompany();
  if (!auth.ok) return [];

  const cleaned = query.trim();
  if (cleaned.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select("worker_name")
    .eq("company_id", auth.companyId)
    .ilike("worker_name", `%${cleaned}%`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data) {
    const name = (row as { worker_name: string }).worker_name;
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
      if (out.length >= 10) break;
    }
  }
  return out;
}

// ─── Project status ────────────────────────────────────────────────────────

const PROJECT_STATUSES = [
  "planning",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
] as const;

export async function updateProjectStatusAction(
  projectId: string,
  to: ProjectStatus,
  reason?: string,
): Promise<SimpleActionResult> {
  if (!PROJECT_STATUSES.includes(to)) {
    return { ok: false, error: "Status inválido." };
  }
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", projectId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  if (!project) return { ok: false, error: "Obra não encontrada." };

  const from = (project as { status: ProjectStatus }).status;
  if (from === to) return { ok: true };
  if (!canTransitionStatus(from, to)) {
    return {
      ok: false,
      error: `Não dá pra ir de "${from}" pra "${to}" diretamente.`,
    };
  }

  const { error } = await supabase
    .from("projects")
    .update({ status: to })
    .eq("id", projectId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("obras.status.update", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  // Quando vira paused, cria entrada de diário com motivo (se houver)
  const cleanReason = (reason ?? "").trim();
  if (to === "paused" && cleanReason.length > 0) {
    const user = await getCurrentUser();
    await supabase.from("diary_entries").insert({
      project_id: projectId,
      company_id: auth.companyId,
      author_id: user?.id ?? null,
      body: `Obra pausada: ${cleanReason.slice(0, 1900)}`,
    });
  }

  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath(`/app/obras`);
  return { ok: true };
}

// --- Billing ---------------------------------------------------------------

export async function generateChargePixAction(
  chargeId: string,
): Promise<SimpleActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("billing_charges")
    .select(
      "id, project_id, company_id, customer_id, kind, status, released_at, project:projects(name), customer:customers(id, name, document, phone, email)",
    )
    .eq("id", chargeId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (error) {
    logServerError("obras.billing.fetch-charge", error);
    return { ok: false, error: clientErrorFor(error) };
  }
  if (!data) return { ok: false, error: "Cobrança não encontrada." };

  const charge = data as unknown as {
    id: string;
    project_id: string;
    company_id: string;
    kind: "entrada" | "saldo";
    status: string;
    released_at: string | null;
    project: { name: string } | { name: string }[] | null;
    customer:
      | {
          id: string;
          name: string;
          document: string | null;
          phone: string | null;
          email: string | null;
        }
      | Array<{
          id: string;
          name: string;
          document: string | null;
          phone: string | null;
          email: string | null;
        }>
      | null;
  };

  if (["received", "confirmed", "cancelled"].includes(charge.status)) {
    return { ok: false, error: "Essa cobrança não pode mais gerar Pix." };
  }

  const customer = Array.isArray(charge.customer)
    ? charge.customer[0]
    : charge.customer;
  if (!customer) return { ok: false, error: "Cliente não encontrado." };

  const project = Array.isArray(charge.project)
    ? charge.project[0]
    : charge.project;
  const kindLabel = charge.kind === "entrada" ? "Entrada" : "Saldo";

  try {
    const result = await generatePreferredPixForCharge(supabase, {
      chargeId: charge.id,
      companyId: auth.companyId,
      customer,
      description: `${kindLabel} - ${project?.name ?? "Obra"}`,
    });

    if (result.warning) {
      logServerWarning("obras.billing.generate_pix_blocked", {
        company_id: auth.companyId,
        project_id: charge.project_id,
        charge_id: charge.id,
        kind: charge.kind,
      });
      return { ok: false, error: result.warning };
    }

    if (charge.kind === "saldo" && !charge.released_at) {
      const releasedAt = new Date().toISOString();
      await Promise.all([
        supabase
          .from("billing_charges")
          .update({ released_at: releasedAt })
          .eq("id", charge.id)
          .eq("company_id", auth.companyId),
        supabase
          .from("projects")
          .update({ delivery_approved_at: releasedAt })
          .eq("id", charge.project_id)
          .eq("company_id", auth.companyId)
          .is("delivery_approved_at", null),
      ]);
    }
  } catch (billingError) {
    logServerError("obras.billing.generate-pix", billingError);
    return { ok: false, error: clientErrorFor(billingError) };
  }

  revalidatePath(`/app/obras/${charge.project_id}`);
  revalidatePath("/app/financeiro");
  logServerEvent("obras.billing.pix_generated", {
    company_id: auth.companyId,
    project_id: charge.project_id,
    charge_id: charge.id,
    kind: charge.kind,
  });
  return { ok: true };
}

export async function markChargePaidManuallyAction(
  chargeId: string,
  note?: string,
): Promise<SimpleActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const auth = await requireCompany();
  if (!auth.ok) return auth;

  try {
    const supabase = createClient();
    const { projectId } = await markManualPixChargePaid(supabase, {
      chargeId,
      companyId: auth.companyId,
      userId: user.id,
      note,
    });

    revalidatePath(`/app/obras/${projectId}`);
    revalidatePath("/app/financeiro");
    return { ok: true };
  } catch (error) {
    logServerError("obras.billing.mark-paid-manual", error);
    return { ok: false, error: clientErrorFor(error) };
  }
}
