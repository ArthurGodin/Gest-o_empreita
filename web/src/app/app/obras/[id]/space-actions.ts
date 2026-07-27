"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  logServerError,
  logServerEvent,
} from "@/lib/log";
import {
  getActiveCompany,
  getCurrentUser,
} from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import type {
  ProjectSpacePriority,
  ProjectSpaceRequirementKind,
  ProjectSpaceRequirementStatus,
  ProjectSpaceStatus,
} from "@/lib/supabase/types";

const uuidSchema = z.string().uuid();
const prioritySchema = z.enum(["low", "normal", "high", "essential"]);
const statusSchema = z.enum(["incomplete", "defined"]);
const requirementKindSchema = z.enum(["need", "constraint", "preference"]);

const spaceInputSchema = z.object({
  projectId: uuidSchema,
  name: z.string().trim().min(1).max(120),
  spaceType: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{0,79}$/)
    .default("other"),
  areaM2: z.number().min(0.01).max(100000).nullable(),
  priority: prioritySchema,
  status: statusSchema,
  notes: z.string().trim().max(3000),
});

export type SpaceActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

export type CreateSpaceActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; code?: string };

async function requireSpaceContext() {
  const [user, company] = await Promise.all([
    getCurrentUser(),
    getActiveCompany(),
  ]);
  if (!user) {
    return {
      ok: false as const,
      error: "Sua sessão expirou. Entre novamente.",
      code: "session_expired",
    };
  }
  if (!company) {
    return {
      ok: false as const,
      error: "Empresa não encontrada.",
      code: "company_not_found",
    };
  }
  if (
    company.company.business_segment !== "architecture" &&
    company.company.business_segment !== "interiors"
  ) {
    return {
      ok: false as const,
      error: "Ambientes estão disponíveis para Arquitetura e Interiores.",
      code: "segment_not_enabled",
    };
  }
  return {
    ok: true as const,
    userId: user.id,
    companyId: company.company_id,
  };
}

export async function createProjectSpaceAction(input: {
  projectId: string;
  name: string;
  spaceType: string;
  areaM2: number | null;
  priority: ProjectSpacePriority;
  status: ProjectSpaceStatus;
  notes: string;
}): Promise<CreateSpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = spaceInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "Revise os dados do ambiente.",
    };
  }

  const supabase = createClient();
  const project = await findProject(
    supabase,
    parsed.data.projectId,
    context.companyId,
  );
  if (!project) {
    return { ok: false, error: "Projeto não encontrado.", code: "not_found" };
  }

  const { data: lastSpace } = await supabase
    .from("project_spaces")
    .select("position")
    .eq("project_id", parsed.data.projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("project_spaces")
    .insert({
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      space_type: parsed.data.spaceType,
      area_m2: parsed.data.areaM2,
      priority: parsed.data.priority,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      position: (lastSpace?.position ?? -1) + 1,
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    logServerError("project_spaces.create", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
    });
    return spaceActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  logServerEvent("project_spaces.created", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
    space_id: data.id,
  });
  return { ok: true, id: data.id };
}

export async function createSuggestedProjectSpacesAction(input: {
  projectId: string;
  sourceRevisionId: string;
  spaces: Array<{ name: string; spaceType: string }>;
}): Promise<SpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;

  const parsed = z
    .object({
      projectId: uuidSchema,
      sourceRevisionId: uuidSchema,
      spaces: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(120),
            spaceType: z
              .string()
              .regex(/^[a-z][a-z0-9_]{0,79}$/),
          }),
        )
        .min(1)
        .max(40),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Selecione ambientes válidos.",
      code: "invalid_fields",
    };
  }

  const supabase = createClient();
  const [{ data: project }, { data: revision }] = await Promise.all([
    supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.projectId)
      .eq("company_id", context.companyId)
      .maybeSingle(),
    supabase
      .from("project_briefing_revisions")
      .select("id")
      .eq("id", parsed.data.sourceRevisionId)
      .eq("project_id", parsed.data.projectId)
      .eq("company_id", context.companyId)
      .maybeSingle(),
  ]);
  if (!project || !revision) {
    return {
      ok: false,
      error: "Projeto ou briefing não encontrado.",
      code: "not_found",
    };
  }

  const { data: existing } = await supabase
    .from("project_spaces")
    .select("name,space_type,position")
    .eq("project_id", parsed.data.projectId)
    .is("archived_at", null);

  const existingKeys = new Set(
    (existing ?? []).map(
      (space) => `${space.space_type}:${space.name.trim().toLowerCase()}`,
    ),
  );
  const selected = parsed.data.spaces.filter(
    (space) =>
      !existingKeys.has(
        `${space.spaceType}:${space.name.trim().toLowerCase()}`,
      ),
  );
  if (selected.length === 0) {
    return {
      ok: false,
      error: "Os ambientes selecionados já existem neste projeto.",
      code: "spaces_exist",
    };
  }

  const firstPosition =
    Math.max(-1, ...(existing ?? []).map((space) => space.position)) + 1;
  const { error } = await supabase.from("project_spaces").insert(
    selected.map((space, index) => ({
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      name: space.name,
      space_type: space.spaceType,
      priority: "normal" as const,
      status: "incomplete" as const,
      position: firstPosition + index,
      created_by: context.userId,
    })),
  );

  if (error) {
    logServerError("project_spaces.create_suggestions", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      requested_count: selected.length,
    });
    return spaceActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  logServerEvent("project_spaces.suggestions_created", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
    source_revision_id: parsed.data.sourceRevisionId,
    created_count: selected.length,
  });
  return { ok: true };
}

export async function updateProjectSpaceAction(input: {
  spaceId: string;
  projectId: string;
  name: string;
  spaceType: string;
  areaM2: number | null;
  priority: ProjectSpacePriority;
  status: ProjectSpaceStatus;
  notes: string;
}): Promise<SpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = spaceInputSchema
    .extend({ spaceId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise os dados do ambiente.",
      code: "invalid_fields",
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_spaces")
    .update({
      name: parsed.data.name,
      space_type: parsed.data.spaceType,
      area_m2: parsed.data.areaM2,
      priority: parsed.data.priority,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .eq("id", parsed.data.spaceId)
    .eq("project_id", parsed.data.projectId)
    .eq("company_id", context.companyId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    logServerError("project_spaces.update", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      space_id: parsed.data.spaceId,
    });
    return spaceActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  return { ok: true };
}

export async function duplicateProjectSpaceAction(input: {
  spaceId: string;
  projectId: string;
}): Promise<CreateSpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = z
    .object({ spaceId: uuidSchema, projectId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ambiente inválido.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const [{ data: source }, { data: requirements }, { data: lastSpace }] =
    await Promise.all([
      supabase
        .from("project_spaces")
        .select("*")
        .eq("id", parsed.data.spaceId)
        .eq("project_id", parsed.data.projectId)
        .eq("company_id", context.companyId)
        .maybeSingle(),
      supabase
        .from("project_space_requirements")
        .select("*")
        .eq("space_id", parsed.data.spaceId)
        .eq("company_id", context.companyId)
        .order("position", { ascending: true }),
      supabase
        .from("project_spaces")
        .select("position")
        .eq("project_id", parsed.data.projectId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!source) {
    return { ok: false, error: "Ambiente não encontrado.", code: "not_found" };
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("project_spaces")
    .insert({
      company_id: source.company_id,
      project_id: source.project_id,
      name: duplicateName(source.name),
      space_type: source.space_type,
      area_m2: source.area_m2,
      priority: source.priority,
      status: "incomplete",
      notes: source.notes,
      position: (lastSpace?.position ?? -1) + 1,
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (duplicateError || !duplicate) {
    return spaceActionError(duplicateError);
  }

  if ((requirements ?? []).length > 0) {
    const { error: requirementsError } = await supabase
      .from("project_space_requirements")
      .insert(
        (requirements ?? []).map((requirement) => ({
          company_id: requirement.company_id,
          project_id: requirement.project_id,
          space_id: duplicate.id,
          kind: requirement.kind,
          description: requirement.description,
          priority: requirement.priority,
          status: "pending" as const,
          source_revision_id: requirement.source_revision_id,
          position: requirement.position,
          created_by: context.userId,
        })),
      );

    if (requirementsError) {
      await supabase
        .from("project_spaces")
        .delete()
        .eq("id", duplicate.id)
        .eq("company_id", context.companyId);
      logServerError("project_spaces.duplicate_requirements", requirementsError, {
        company_id: context.companyId,
        project_id: parsed.data.projectId,
        source_space_id: parsed.data.spaceId,
      });
      return {
        ok: false,
        error: "Não foi possível duplicar o ambiente completo.",
        code: "duplicate_failed",
      };
    }
  }

  revalidateProject(parsed.data.projectId);
  return { ok: true, id: duplicate.id };
}

export async function moveProjectSpaceAction(input: {
  spaceId: string;
  projectId: string;
  direction: "up" | "down";
}): Promise<SpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = z
    .object({
      spaceId: uuidSchema,
      projectId: uuidSchema,
      direction: z.enum(["up", "down"]),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Movimento inválido.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const { data: spaces, error: listError } = await supabase
    .from("project_spaces")
    .select("id,position")
    .eq("project_id", parsed.data.projectId)
    .eq("company_id", context.companyId)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (listError) return spaceActionError(listError);
  const index = (spaces ?? []).findIndex(
    (space) => space.id === parsed.data.spaceId,
  );
  const targetIndex =
    parsed.data.direction === "up" ? index - 1 : index + 1;
  const current = spaces?.[index];
  const target = spaces?.[targetIndex];
  if (!current || !target) return { ok: true };

  const first = await supabase
    .from("project_spaces")
    .update({ position: target.position })
    .eq("id", current.id)
    .eq("company_id", context.companyId);
  if (first.error) return spaceActionError(first.error);

  const second = await supabase
    .from("project_spaces")
    .update({ position: current.position })
    .eq("id", target.id)
    .eq("company_id", context.companyId);
  if (second.error) {
    await supabase
      .from("project_spaces")
      .update({ position: current.position })
      .eq("id", current.id)
      .eq("company_id", context.companyId);
    return spaceActionError(second.error);
  }

  revalidateProject(parsed.data.projectId);
  return { ok: true };
}

export async function setProjectSpaceArchivedAction(input: {
  spaceId: string;
  projectId: string;
  archived: boolean;
}): Promise<SpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = z
    .object({
      spaceId: uuidSchema,
      projectId: uuidSchema,
      archived: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Ambiente inválido.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_spaces")
    .update({ archived_at: parsed.data.archived ? new Date().toISOString() : null })
    .eq("id", parsed.data.spaceId)
    .eq("project_id", parsed.data.projectId)
    .eq("company_id", context.companyId)
    .select("id")
    .maybeSingle();

  if (error || !data) return spaceActionError(error);
  revalidateProject(parsed.data.projectId);
  return { ok: true };
}

export async function addSpaceRequirementAction(input: {
  projectId: string;
  spaceId: string;
  kind: ProjectSpaceRequirementKind;
  description: string;
  priority: ProjectSpacePriority;
  sourceRevisionId?: string | null;
}): Promise<CreateSpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = z
    .object({
      projectId: uuidSchema,
      spaceId: uuidSchema,
      kind: requirementKindSchema,
      description: z.string().trim().min(1).max(1000),
      priority: prioritySchema,
      sourceRevisionId: uuidSchema.nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise a necessidade informada.",
      code: "invalid_fields",
    };
  }

  const supabase = createClient();
  const { data: lastRequirement } = await supabase
    .from("project_space_requirements")
    .select("position")
    .eq("space_id", parsed.data.spaceId)
    .eq("company_id", context.companyId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("project_space_requirements")
    .insert({
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      space_id: parsed.data.spaceId,
      kind: parsed.data.kind,
      description: parsed.data.description,
      priority: parsed.data.priority,
      status: "pending",
      source_revision_id: parsed.data.sourceRevisionId ?? null,
      position: (lastRequirement?.position ?? -1) + 1,
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !data) return spaceActionError(error);
  revalidateProject(parsed.data.projectId);
  return { ok: true, id: data.id };
}

export async function setSpaceRequirementStatusAction(input: {
  projectId: string;
  requirementId: string;
  status: ProjectSpaceRequirementStatus;
}): Promise<SpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = z
    .object({
      projectId: uuidSchema,
      requirementId: uuidSchema,
      status: z.enum(["pending", "defined"]),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Necessidade inválida.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_space_requirements")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.requirementId)
    .eq("project_id", parsed.data.projectId)
    .eq("company_id", context.companyId)
    .select("id")
    .maybeSingle();

  if (error || !data) return spaceActionError(error);
  revalidateProject(parsed.data.projectId);
  return { ok: true };
}

export async function deleteSpaceRequirementAction(input: {
  projectId: string;
  requirementId: string;
}): Promise<SpaceActionResult> {
  const context = await requireSpaceContext();
  if (!context.ok) return context;
  const parsed = z
    .object({ projectId: uuidSchema, requirementId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Necessidade inválida.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const { error, count } = await supabase
    .from("project_space_requirements")
    .delete({ count: "exact" })
    .eq("id", parsed.data.requirementId)
    .eq("project_id", parsed.data.projectId)
    .eq("company_id", context.companyId);

  if (error || count === 0) return spaceActionError(error);
  revalidateProject(parsed.data.projectId);
  return { ok: true };
}

async function findProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  companyId: string,
) {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();
  return data;
}

function revalidateProject(projectId: string) {
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath("/app/obras");
  revalidatePath("/app");
}

function duplicateName(name: string) {
  const suffix = " (cópia)";
  const base = name.trim().slice(0, 120 - suffix.length);
  return `${base}${suffix}`;
}

function spaceActionError(error: unknown): {
  ok: false;
  error: string;
  code?: string;
} {
  const message = ((error as { message?: string } | null)?.message ?? "")
    .toLowerCase();
  if (message.includes("project_space_limit_reached")) {
    return {
      ok: false,
      code: "space_limit_reached",
      error:
        "O Grátis permite até 3 ambientes. Seus dados continuam disponíveis; assine o Pro para adicionar mais.",
    };
  }
  if (message.includes("project_workspace_locked")) {
    return {
      ok: false,
      code: "project_locked",
      error: "Este projeto foi encerrado e os ambientes estão protegidos.",
    };
  }
  if (
    message.includes("scope_mismatch") ||
    message.includes("row-level security")
  ) {
    return {
      ok: false,
      code: "not_found",
      error: "Projeto ou ambiente não encontrado.",
    };
  }
  return {
    ok: false,
    code: "unexpected",
    error: "Não foi possível salvar agora. Tente novamente.",
  };
}
