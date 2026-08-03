"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getBriefingTemplate,
} from "@/lib/briefings";
import { env } from "@/lib/env";
import {
  logServerError,
  logServerEvent,
} from "@/lib/log";
import {
  getActiveCompany,
  getCurrentUser,
} from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const uuidSchema = z.string().uuid();

export type BriefingActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

export type CreateBriefingActionResult =
  | { ok: true; briefingId: string; revisionId: string }
  | { ok: false; error: string; code?: string };

export type ShareBriefingActionResult =
  | { ok: true; shareUrl: string }
  | { ok: false; error: string; code?: string };

async function requireBriefingContext() {
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
  return {
    ok: true as const,
    userId: user.id,
    companyId: company.company_id,
    role: company.role,
    segment: company.company.business_segment,
  };
}

export async function createProjectBriefingAction(input: {
  projectId: string;
  templateKey: string;
}): Promise<CreateBriefingActionResult> {
  const context = await requireBriefingContext();
  if (!context.ok) return context;

  const parsed = z
    .object({
      projectId: uuidSchema,
      templateKey: z.string().min(1).max(120),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "Escolha um modelo de briefing válido.",
    };
  }

  const template = getBriefingTemplate(
    parsed.data.templateKey,
    context.segment,
  );
  if (!template) {
    return {
      ok: false,
      code: "template_not_found",
      error: "Este modelo não está disponível para o perfil da empresa.",
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_project_briefing", {
    p_project_id: parsed.data.projectId,
    p_template_key: template.key,
    p_schema_version: template.version,
    p_schema_snapshot: template as unknown as Json,
  });

  const created = data?.[0];
  if (error || !created) {
    logServerError("briefings.create", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      template_key: template.key,
    });
    return briefingActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  logServerEvent("briefings.created", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
    briefing_id: created.briefing_id,
    template_key: template.key,
  });

  return {
    ok: true,
    briefingId: created.briefing_id,
    revisionId: created.revision_id,
  };
}

export async function shareProjectBriefingAction(input: {
  briefingId: string;
  projectId: string;
}): Promise<ShareBriefingActionResult> {
  const context = await requireBriefingContext();
  if (!context.ok) return context;

  const parsed = z
    .object({ briefingId: uuidSchema, projectId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Briefing inválido.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const [briefingResult, quoteResult, projectResult] = await Promise.all([
    supabase
      .from("project_briefings")
      .select("id")
      .eq("id", parsed.data.briefingId)
      .eq("project_id", parsed.data.projectId)
      .eq("company_id", context.companyId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("quotes")
      .select("share_token")
      .eq("project_id", parsed.data.projectId)
      .eq("company_id", context.companyId)
      .eq("status", "approved")
      .not("share_token", "is", null)
      .order("approved_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("creation_source,client_access_token")
      .eq("id", parsed.data.projectId)
      .eq("company_id", context.companyId)
      .maybeSingle(),
  ]);

  if (briefingResult.error || !briefingResult.data) {
    return { ok: false, error: "Briefing não encontrado.", code: "not_found" };
  }

  if (quoteResult.error || projectResult.error) {
    logServerError(
      "briefings.public-link",
      quoteResult.error ?? projectResult.error,
      {
        company_id: context.companyId,
        project_id: parsed.data.projectId,
      },
    );
    return briefingActionError(quoteResult.error ?? projectResult.error);
  }

  const quoteToken = quoteResult.data?.share_token ?? null;
  const directToken =
    projectResult.data?.creation_source === "direct"
      ? projectResult.data.client_access_token
      : null;
  const accessToken = quoteToken ?? directToken;
  const accessKind = quoteToken ? "quote" : directToken ? "project" : null;

  if (!accessToken || !accessKind) {
    return {
      ok: false,
      code: "public_link_unavailable",
      error: "Este projeto ainda não possui um acesso público disponível.",
    };
  }

  const { error } = await supabase.rpc("share_project_briefing", {
    p_briefing_id: parsed.data.briefingId,
  });
  if (error) {
    logServerError("briefings.share", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      briefing_id: parsed.data.briefingId,
    });
    return briefingActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  logServerEvent("briefings.shared", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
    briefing_id: parsed.data.briefingId,
  });

  return {
    ok: true,
    shareUrl:
      accessKind === "project"
        ? `${env.NEXT_PUBLIC_APP_URL}/p/${encodeURIComponent(accessToken)}`
        : `${env.NEXT_PUBLIC_APP_URL}/q/${encodeURIComponent(accessToken)}?tab=briefing`,
  };
}

export async function regenerateProjectClientAccessTokenAction(input: {
  projectId: string;
}): Promise<ShareBriefingActionResult> {
  const context = await requireBriefingContext();
  if (!context.ok) return context;
  if (context.role !== "owner" && context.role !== "manager") {
    return {
      ok: false,
      code: "not_allowed",
      error: "Somente responsáveis podem gerar um novo link.",
    };
  }

  const parsed = z.object({ projectId: uuidSchema }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Projeto inválido.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("client_access_token,creation_source")
    .eq("id", parsed.data.projectId)
    .eq("company_id", context.companyId)
    .maybeSingle();

  if (projectError || project?.creation_source !== "direct") {
    return {
      ok: false,
      code: "public_link_unavailable",
      error: "Este projeto não usa um link público direto.",
    };
  }

  const { data: token, error } = await supabase.rpc(
    "regenerate_project_client_access_token",
    { p_project_id: parsed.data.projectId },
  );
  if (error || !token) {
    logServerError("briefings.public-link.regenerate", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
    });
    return briefingActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  if (project.client_access_token) {
    revalidatePath(`/p/${project.client_access_token}`);
  }
  revalidatePath(`/p/${token}`);
  logServerEvent("briefings.public-link.regenerated", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
  });

  return {
    ok: true,
    shareUrl: `${env.NEXT_PUBLIC_APP_URL}/p/${encodeURIComponent(token)}`,
  };
}

export async function reviewProjectBriefingAction(input: {
  briefingId: string;
  projectId: string;
  internalNotes: string;
}): Promise<BriefingActionResult> {
  const context = await requireBriefingContext();
  if (!context.ok) return context;

  const parsed = z
    .object({
      briefingId: uuidSchema,
      projectId: uuidSchema,
      internalNotes: z.string().trim().max(5000),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "As observações devem ter no máximo 5.000 caracteres.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("review_project_briefing", {
    p_briefing_id: parsed.data.briefingId,
    p_internal_notes: parsed.data.internalNotes || null,
  });
  if (error) {
    logServerError("briefings.review", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      briefing_id: parsed.data.briefingId,
    });
    return briefingActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  logServerEvent("briefings.reviewed", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
    briefing_id: parsed.data.briefingId,
  });
  return { ok: true };
}

export async function reopenProjectBriefingAction(input: {
  briefingId: string;
  projectId: string;
  note: string;
}): Promise<BriefingActionResult> {
  const context = await requireBriefingContext();
  if (!context.ok) return context;

  const parsed = z
    .object({
      briefingId: uuidSchema,
      projectId: uuidSchema,
      note: z.string().trim().max(1000),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "A orientação deve ter no máximo 1.000 caracteres.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("reopen_project_briefing", {
    p_briefing_id: parsed.data.briefingId,
    p_reopen_note: parsed.data.note || null,
  });
  if (error) {
    logServerError("briefings.reopen", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      briefing_id: parsed.data.briefingId,
    });
    return briefingActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  logServerEvent("briefings.reopened", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
    briefing_id: parsed.data.briefingId,
  });
  return { ok: true };
}

export async function archiveProjectBriefingAction(input: {
  briefingId: string;
  projectId: string;
}): Promise<BriefingActionResult> {
  const context = await requireBriefingContext();
  if (!context.ok) return context;

  const parsed = z
    .object({ briefingId: uuidSchema, projectId: uuidSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Briefing inválido.", code: "invalid_fields" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("archive_project_briefing", {
    p_briefing_id: parsed.data.briefingId,
  });
  if (error) {
    logServerError("briefings.archive", error, {
      company_id: context.companyId,
      project_id: parsed.data.projectId,
      briefing_id: parsed.data.briefingId,
    });
    return briefingActionError(error);
  }

  revalidateProject(parsed.data.projectId);
  logServerEvent("briefings.archived", {
    company_id: context.companyId,
    project_id: parsed.data.projectId,
    briefing_id: parsed.data.briefingId,
  });
  return { ok: true };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath("/app/obras");
  revalidatePath("/app");
}

function briefingActionError(error: unknown): {
  ok: false;
  error: string;
  code?: string;
} {
  const message = ((error as { message?: string } | null)?.message ?? "")
    .toLowerCase();

  if (message.includes("project_briefing_limit_reached")) {
    return {
      ok: false,
      code: "briefing_limit_reached",
      error:
        "O Grátis permite um briefing ativo. Seus dados continuam disponíveis; assine o Pro para usar em outros projetos.",
    };
  }
  if (message.includes("project_briefing_revision_limit_reached")) {
    return {
      ok: false,
      code: "revision_limit_reached",
      error:
        "O Grátis inclui uma rodada de briefing. Assine o Pro para reabrir e manter novas revisões.",
    };
  }
  if (message.includes("active_briefing_exists")) {
    return {
      ok: false,
      code: "briefing_exists",
      error: "Este projeto já possui um briefing ativo.",
    };
  }
  if (message.includes("briefing_segment_not_enabled")) {
    return {
      ok: false,
      code: "segment_not_enabled",
      error: "Briefings estão disponíveis para Arquitetura e Interiores.",
    };
  }
  if (message.includes("project_briefing_locked")) {
    return {
      ok: false,
      code: "project_locked",
      error: "Este projeto foi encerrado e o briefing está protegido.",
    };
  }
  if (
    message.includes("briefing_not_found") ||
    message.includes("project_not_found")
  ) {
    return {
      ok: false,
      code: "not_found",
      error: "Projeto ou briefing não encontrado.",
    };
  }

  return {
    ok: false,
    code: "unexpected",
    error: "Não foi possível concluir agora. Tente novamente.",
  };
}
