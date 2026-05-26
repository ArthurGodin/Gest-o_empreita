"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";
import { deleteDiaryPhotos } from "@/lib/supabase/storage";
import type { Database, StageStatus } from "@/lib/supabase/types";

type StageUpdate = Database["public"]["Tables"]["project_stages"]["Update"];

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

// ─── Helpers locais ────────────────────────────────────────────────────────

function todayBR(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
