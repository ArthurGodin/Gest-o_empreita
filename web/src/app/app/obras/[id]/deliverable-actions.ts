"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  validateDeliverableExternalUrl,
  validateDeliverableFile,
} from "@/lib/deliverables";
import { clientErrorFor, logServerError, logServerEvent } from "@/lib/log";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import {
  createDeliverableSignedUpload,
  deleteDeliverableFile,
  getDeliverableFileInfo,
} from "@/lib/supabase/storage";
import type { ProjectDeliverableSourceKind } from "@/lib/supabase/types";

const uuidSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(160);
const descriptionSchema = z.string().trim().max(2000);
const noteSchema = z.string().trim().max(1000);

const commonDraftSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  stageId: z.string().uuid().nullable(),
  changeNote: noteSchema,
});

const sourceSchema = z.discriminatedUnion("sourceKind", [
  z.object({
    sourceKind: z.literal("file"),
    fileName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
  }),
  z.object({
    sourceKind: z.literal("external_link"),
    externalUrl: z.string(),
  }),
]);

export type DeliverableSourceInput = z.infer<typeof sourceSchema>;

export type DeliverableActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

export type DeliverableDraftResult =
  | {
      ok: true;
      deliverableId: string;
      versionId: string;
      versionNumber: number;
      upload:
        | {
            bucket: "project-deliverables";
            path: string;
            token: string;
          }
        | null;
    }
  | { ok: false; error: string; code?: string };

export type DeliverableUploadAuthorizationResult =
  | {
      ok: true;
      upload: {
        bucket: "project-deliverables";
        path: string;
        token: string;
      };
    }
  | { ok: false; error: string; code?: string };

type AuthContext =
  | { ok: true; companyId: string; userId: string }
  | { ok: false; error: string; code: string };

async function requireContext(): Promise<AuthContext> {
  const [user, company] = await Promise.all([
    getCurrentUser(),
    getActiveCompany(),
  ]);
  if (!user) {
    return {
      ok: false,
      error: "Sua sessão expirou. Entre novamente.",
      code: "session_expired",
    };
  }
  if (!company) {
    return {
      ok: false,
      error: "Empresa não encontrada.",
      code: "company_not_found",
    };
  }
  return {
    ok: true,
    companyId: company.company_id,
    userId: user.id,
  };
}

export async function createDeliverableDraftAction(input: {
  projectId: string;
  title: string;
  description: string;
  stageId: string | null;
  changeNote: string;
  source: DeliverableSourceInput;
}): Promise<DeliverableDraftResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = z
    .object({
      projectId: uuidSchema,
      ...commonDraftSchema.shape,
      source: sourceSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "Revise os dados da entrega.",
    };
  }

  const source = normalizeSource(parsed.data.source);
  if (!source.ok) return source;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_project_deliverable", {
    p_project_id: parsed.data.projectId,
    p_stage_id: parsed.data.stageId,
    p_title: parsed.data.title,
    p_description: parsed.data.description || null,
    p_source_kind: source.value.sourceKind,
    p_external_url: source.value.externalUrl,
    p_file_name: source.value.fileName,
    p_mime_type: source.value.mimeType,
    p_expected_size_bytes: source.value.sizeBytes,
    p_change_note: parsed.data.changeNote || null,
  });

  const created = data?.[0];
  if (error || !created) {
    logServerError("deliverables.create", error, {
      company_id: auth.companyId,
      project_id: parsed.data.projectId,
      source_kind: source.value.sourceKind,
    });
    return deliverableError(error);
  }

  const upload = await authorizeUploadOrCleanup({
    supabase,
    sourceKind: source.value.sourceKind,
    storagePath: created.storage_path,
    deliverableId: created.deliverable_id,
    versionId: created.version_id,
    cleanup: "deliverable",
  });
  if (!upload.ok) return upload;

  revalidateProjectPaths(parsed.data.projectId);
  logServerEvent("deliverables.created", {
    company_id: auth.companyId,
    project_id: parsed.data.projectId,
    deliverable_id: created.deliverable_id,
    version_id: created.version_id,
    source_kind: source.value.sourceKind,
    size_bytes: source.value.sizeBytes,
  });

  return {
    ok: true,
    deliverableId: created.deliverable_id,
    versionId: created.version_id,
    versionNumber: created.version_number,
    upload: upload.upload,
  };
}

export async function createDeliverableVersionDraftAction(input: {
  deliverableId: string;
  changeNote: string;
  source: DeliverableSourceInput;
}): Promise<DeliverableDraftResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = z
    .object({
      deliverableId: uuidSchema,
      changeNote: noteSchema,
      source: sourceSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "Revise os dados da nova versão.",
    };
  }

  const source = normalizeSource(parsed.data.source);
  if (!source.ok) return source;

  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "create_project_deliverable_version",
    {
      p_deliverable_id: parsed.data.deliverableId,
      p_source_kind: source.value.sourceKind,
      p_external_url: source.value.externalUrl,
      p_file_name: source.value.fileName,
      p_mime_type: source.value.mimeType,
      p_expected_size_bytes: source.value.sizeBytes,
      p_change_note: parsed.data.changeNote || null,
    },
  );

  const created = data?.[0];
  if (error || !created) {
    logServerError("deliverables.version.create", error, {
      company_id: auth.companyId,
      deliverable_id: parsed.data.deliverableId,
      source_kind: source.value.sourceKind,
    });
    return deliverableError(error);
  }

  const upload = await authorizeUploadOrCleanup({
    supabase,
    sourceKind: source.value.sourceKind,
    storagePath: created.storage_path,
    deliverableId: created.deliverable_id,
    versionId: created.version_id,
    cleanup: "version",
  });
  if (!upload.ok) return upload;

  await revalidateProjectPathsFromVersion(supabase, created.version_id);
  logServerEvent("deliverables.version.created", {
    company_id: auth.companyId,
    deliverable_id: created.deliverable_id,
    version_id: created.version_id,
    version_number: created.version_number,
    source_kind: source.value.sourceKind,
    size_bytes: source.value.sizeBytes,
  });

  return {
    ok: true,
    deliverableId: created.deliverable_id,
    versionId: created.version_id,
    versionNumber: created.version_number,
    upload: upload.upload,
  };
}

export async function finalizeDeliverableUploadAction(
  versionId: string,
): Promise<DeliverableActionResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = uuidSchema.safeParse(versionId);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_version",
      error: "Versão inválida.",
    };
  }

  const supabase = createClient();
  const { data: version, error: versionError } = await supabase
    .from("project_deliverable_versions")
    .select(
      "id, company_id, project_id, source_kind, upload_state, storage_path, mime_type, expected_size_bytes, published_at",
    )
    .eq("id", parsed.data)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (versionError || !version) {
    logServerError("deliverables.upload.fetch", versionError, {
      company_id: auth.companyId,
      version_id: parsed.data,
    });
    return {
      ok: false,
      code: "version_not_found",
      error: "Versão não encontrada.",
    };
  }

  if (
    version.source_kind !== "file" ||
    !version.storage_path ||
    !version.mime_type ||
    version.expected_size_bytes === null ||
    version.published_at !== null
  ) {
    return {
      ok: false,
      code: "upload_not_finalizable",
      error: "Este upload não pode mais ser finalizado.",
    };
  }

  if (version.upload_state === "ready") return { ok: true };

  const info = await getDeliverableFileInfo(version.storage_path);
  if (
    !info.ok ||
    info.sizeBytes !== version.expected_size_bytes ||
    info.mimeType !== version.mime_type
  ) {
    await deleteDeliverableFile(version.storage_path);
    logServerError(
      "deliverables.upload.metadata",
      info.ok ? new Error("metadata mismatch") : new Error(info.error),
      {
        company_id: auth.companyId,
        project_id: version.project_id,
        version_id: version.id,
      },
    );
    return {
      ok: false,
      code: "upload_metadata_mismatch",
      error:
        "O arquivo recebido não corresponde ao selecionado. Tente enviar novamente.",
    };
  }

  const { data: finalized, error: finalizeError } = await supabase.rpc(
    "finalize_project_deliverable_upload",
    {
      p_version_id: version.id,
      p_size_bytes: info.sizeBytes,
      p_mime_type: info.mimeType,
    },
  );

  if (finalizeError || !finalized) {
    logServerError("deliverables.upload.finalize", finalizeError, {
      company_id: auth.companyId,
      project_id: version.project_id,
      version_id: version.id,
    });
    return deliverableError(finalizeError);
  }

  revalidateProjectPaths(version.project_id);
  logServerEvent("deliverables.upload.completed", {
    company_id: auth.companyId,
    project_id: version.project_id,
    version_id: version.id,
    size_bytes: info.sizeBytes,
  });
  return { ok: true };
}

export async function reauthorizeDeliverableUploadAction(
  versionId: string,
): Promise<DeliverableUploadAuthorizationResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = uuidSchema.safeParse(versionId);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_version",
      error: "Vers\u00e3o inv\u00e1lida.",
    };
  }

  const supabase = createClient();
  const { data: version, error } = await supabase
    .from("project_deliverable_versions")
    .select(
      "id, deliverable_id, project_id, source_kind, upload_state, storage_path, published_at",
    )
    .eq("id", parsed.data)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (
    error ||
    !version ||
    version.source_kind !== "file" ||
    version.upload_state !== "pending" ||
    !version.storage_path ||
    version.published_at
  ) {
    return {
      ok: false,
      code: "upload_not_resumable",
      error: "Este upload n\u00e3o pode mais ser retomado.",
    };
  }

  const mutable = await loadMutableDeliverable(
    supabase,
    version.deliverable_id,
    auth.companyId,
  );
  if (!mutable.ok) return mutable;

  const removed = await deleteDeliverableFile(version.storage_path);
  if (!removed.ok) {
    logServerError("deliverables.upload.resume-cleanup", removed.error, {
      company_id: auth.companyId,
      project_id: version.project_id,
      version_id: version.id,
    });
    return {
      ok: false,
      code: "storage_cleanup_failed",
      error: "N\u00e3o foi poss\u00edvel preparar o reenvio. Tente novamente.",
    };
  }

  const signed = await createDeliverableSignedUpload(version.storage_path);
  if (!signed.ok) {
    logServerError("deliverables.upload.reauthorize", signed.error, {
      company_id: auth.companyId,
      project_id: version.project_id,
      version_id: version.id,
    });
    return {
      ok: false,
      code: "upload_authorization_failed",
      error: "N\u00e3o foi poss\u00edvel retomar o upload. Tente novamente.",
    };
  }

  logServerEvent("deliverables.upload.resumed", {
    company_id: auth.companyId,
    project_id: version.project_id,
    version_id: version.id,
  });
  return {
    ok: true,
    upload: {
      bucket: "project-deliverables",
      path: signed.path,
      token: signed.token,
    },
  };
}

export async function publishDeliverableVersionAction(input: {
  deliverableId: string;
  versionId: string;
}): Promise<DeliverableActionResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = z
    .object({
      deliverableId: uuidSchema,
      versionId: uuidSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_version",
      error: "Entrega ou versão inválida.",
    };
  }

  const supabase = createClient();
  const { data: deliverable } = await supabase
    .from("project_deliverables")
    .select("project_id")
    .eq("id", parsed.data.deliverableId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (!deliverable) {
    return {
      ok: false,
      code: "deliverable_not_found",
      error: "Entrega não encontrada.",
    };
  }

  const { error } = await supabase.rpc(
    "publish_project_deliverable_version",
    {
      p_deliverable_id: parsed.data.deliverableId,
      p_version_id: parsed.data.versionId,
    },
  );

  if (error) {
    logServerError("deliverables.publish", error, {
      company_id: auth.companyId,
      project_id: deliverable.project_id,
      deliverable_id: parsed.data.deliverableId,
      version_id: parsed.data.versionId,
    });
    return deliverableError(error);
  }

  await revalidateProjectAndPublicPaths(
    supabase,
    deliverable.project_id,
  );
  logServerEvent("deliverables.published", {
    company_id: auth.companyId,
    project_id: deliverable.project_id,
    deliverable_id: parsed.data.deliverableId,
    version_id: parsed.data.versionId,
  });
  return { ok: true };
}

export async function updateDeliverableAction(input: {
  deliverableId: string;
  title: string;
  description: string;
  stageId: string | null;
}): Promise<DeliverableActionResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = z
    .object({
      deliverableId: uuidSchema,
      title: titleSchema,
      description: descriptionSchema,
      stageId: z.string().uuid().nullable(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_fields",
      error: "Revise os dados da entrega.",
    };
  }

  const supabase = createClient();
  const existing = await loadMutableDeliverable(
    supabase,
    parsed.data.deliverableId,
    auth.companyId,
  );
  if (!existing.ok) return existing;

  const { error } = await supabase.rpc("update_project_deliverable", {
    p_deliverable_id: parsed.data.deliverableId,
    p_title: parsed.data.title,
    p_description: parsed.data.description || null,
    p_stage_id: parsed.data.stageId,
  });

  if (error) {
    logServerError("deliverables.update", error, {
      company_id: auth.companyId,
      deliverable_id: parsed.data.deliverableId,
    });
    return deliverableError(error);
  }

  await revalidateProjectAndPublicPaths(supabase, existing.projectId);
  return { ok: true };
}

export async function setDeliverableArchivedAction(input: {
  deliverableId: string;
  archived: boolean;
}): Promise<DeliverableActionResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = z
    .object({
      deliverableId: uuidSchema,
      archived: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_deliverable",
      error: "Entrega inválida.",
    };
  }

  const supabase = createClient();
  const existing = await loadMutableDeliverable(
    supabase,
    parsed.data.deliverableId,
    auth.companyId,
  );
  if (!existing.ok) return existing;

  const { error } = await supabase.rpc(
    "set_project_deliverable_archived",
    {
      p_deliverable_id: parsed.data.deliverableId,
      p_archived: parsed.data.archived,
    },
  );

  if (error) {
    logServerError("deliverables.archive", error, {
      company_id: auth.companyId,
      deliverable_id: parsed.data.deliverableId,
    });
    return deliverableError(error);
  }

  await revalidateProjectAndPublicPaths(supabase, existing.projectId);
  logServerEvent(
    parsed.data.archived
      ? "deliverables.archived"
      : "deliverables.restored",
    {
      company_id: auth.companyId,
      project_id: existing.projectId,
      deliverable_id: parsed.data.deliverableId,
    },
  );
  return { ok: true };
}

export async function deleteDeliverableDraftAction(input: {
  deliverableId: string;
  versionId: string;
}): Promise<DeliverableActionResult> {
  const auth = await requireContext();
  if (!auth.ok) return auth;

  const parsed = z
    .object({
      deliverableId: uuidSchema,
      versionId: uuidSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_version",
      error: "Rascunho inválido.",
    };
  }

  const supabase = createClient();
  const { data: version, error: versionError } = await supabase
    .from("project_deliverable_versions")
    .select("id, project_id, storage_path, published_at")
    .eq("id", parsed.data.versionId)
    .eq("deliverable_id", parsed.data.deliverableId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (versionError || !version || version.published_at !== null) {
    return {
      ok: false,
      code: "draft_not_found",
      error: "Rascunho não encontrado.",
    };
  }

  if (version.storage_path) {
    const removed = await deleteDeliverableFile(version.storage_path);
    if (!removed.ok) {
      logServerError("deliverables.draft.storage-delete", removed.error, {
        company_id: auth.companyId,
        project_id: version.project_id,
        version_id: version.id,
      });
      return {
        ok: false,
        code: "storage_delete_failed",
        error: "Não foi possível remover o arquivo agora. Tente novamente.",
      };
    }
  }

  const { error: deleteError } = await supabase.rpc(
    "delete_project_deliverable_draft",
    {
      p_deliverable_id: parsed.data.deliverableId,
      p_version_id: version.id,
    },
  );

  if (deleteError) {
    logServerError("deliverables.draft.delete", deleteError, {
      company_id: auth.companyId,
      project_id: version.project_id,
      version_id: version.id,
    });
    return deliverableError(deleteError);
  }

  revalidateProjectPaths(version.project_id);
  return { ok: true };
}

function normalizeSource(
  source: DeliverableSourceInput,
):
  | {
      ok: true;
      value: {
        sourceKind: ProjectDeliverableSourceKind;
        externalUrl: string | null;
        fileName: string | null;
        mimeType: string | null;
        sizeBytes: number | null;
      };
    }
  | { ok: false; error: string; code: string } {
  if (source.sourceKind === "file") {
    const validated = validateDeliverableFile({
      fileName: source.fileName,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
    });
    if (!validated.ok) return validated;
    return {
      ok: true,
      value: {
        sourceKind: "file",
        externalUrl: null,
        fileName: validated.value.fileName,
        mimeType: validated.value.mimeType,
        sizeBytes: validated.value.sizeBytes,
      },
    };
  }

  const validated = validateDeliverableExternalUrl(source.externalUrl);
  if (!validated.ok) return validated;
  return {
    ok: true,
    value: {
      sourceKind: "external_link",
      externalUrl: validated.value,
      fileName: null,
      mimeType: null,
      sizeBytes: null,
    },
  };
}

async function authorizeUploadOrCleanup({
  supabase,
  sourceKind,
  storagePath,
  deliverableId,
  versionId,
  cleanup,
}: {
  supabase: ReturnType<typeof createClient>;
  sourceKind: ProjectDeliverableSourceKind;
  storagePath: string | null;
  deliverableId: string;
  versionId: string;
  cleanup: "deliverable" | "version";
}): Promise<
  | {
      ok: true;
      upload: {
        bucket: "project-deliverables";
        path: string;
        token: string;
      } | null;
    }
  | { ok: false; error: string; code: string }
> {
  if (sourceKind === "external_link") {
    return { ok: true, upload: null };
  }
  if (!storagePath) {
    return {
      ok: false,
      code: "storage_path_missing",
      error: "Não foi possível preparar o arquivo.",
    };
  }

  const signed = await createDeliverableSignedUpload(storagePath);
  if (!signed.ok) {
    const cleanupResult = await supabase.rpc(
      "delete_project_deliverable_draft",
      {
        p_deliverable_id: deliverableId,
        p_version_id: versionId,
      },
    );

    if (cleanupResult.error) {
      logServerError(
        "deliverables.upload.authorization-cleanup",
        cleanupResult.error,
        {
          deliverable_id: deliverableId,
          version_id: versionId,
          cleanup_scope: cleanup,
        },
      );
    }
    logServerError("deliverables.upload.authorization", signed.error, {
      deliverable_id: deliverableId,
      version_id: versionId,
    });
    return {
      ok: false,
      code: "upload_authorization_failed",
      error: "Não foi possível preparar o upload. Tente novamente.",
    };
  }

  return {
    ok: true,
    upload: {
      bucket: "project-deliverables",
      path: signed.path,
      token: signed.token,
    },
  };
}

async function loadMutableDeliverable(
  supabase: ReturnType<typeof createClient>,
  deliverableId: string,
  companyId: string,
): Promise<
  | { ok: true; projectId: string }
  | { ok: false; error: string; code: string }
> {
  const { data, error } = await supabase
    .from("project_deliverables")
    .select(
      "project_id, project:projects(delivery_approved_at)",
    )
    .eq("id", deliverableId)
    .eq("company_id", companyId)
    .maybeSingle();

  const project = firstRelation(data?.project);
  if (error || !data || !project) {
    return {
      ok: false,
      code: "deliverable_not_found",
      error: "Entrega não encontrada.",
    };
  }
  if (project.delivery_approved_at) {
    return {
      ok: false,
      code: "project_deliverables_locked",
      error: "O projeto já teve a entrega final confirmada.",
    };
  }
  return { ok: true, projectId: data.project_id };
}

function deliverableError(
  error: unknown,
): { ok: false; error: string; code?: string } {
  const message = (
    (error as { message?: string } | null)?.message ?? ""
  ).toLowerCase();

  const known: Array<[string, string, string]> = [
    [
      "deliverable_limit_reached",
      "deliverable_limit_reached",
      "Você atingiu o limite de entregas deste plano.",
    ],
    [
      "deliverable_storage_quota_reached",
      "storage_quota_reached",
      "O armazenamento do plano acabou. Use um link externo ou aumente o plano.",
    ],
    [
      "project_deliverables_locked",
      "project_deliverables_locked",
      "As entregas estão bloqueadas porque o projeto foi cancelado ou já teve o aceite final.",
    ],
    [
      "deliverable_draft_exists",
      "deliverable_draft_exists",
      "Já existe uma versão em rascunho para esta entrega.",
    ],
    [
      "deliverable_review_pending",
      "deliverable_review_pending",
      "A versão atual ainda aguarda a decisão do cliente.",
    ],
    [
      "deliverable_upload_not_ready",
      "deliverable_upload_not_ready",
      "Conclua o upload antes de publicar.",
    ],
    [
      "deliverable_version_superseded",
      "deliverable_version_superseded",
      "Uma versão mais recente já está disponível.",
    ],
  ];

  for (const [needle, code, friendlyMessage] of known) {
    if (message.includes(needle)) {
      return { ok: false, code, error: friendlyMessage };
    }
  }

  return { ok: false, error: clientErrorFor(error) };
}

function revalidateProjectPaths(projectId: string) {
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath("/app/obras");
  revalidatePath("/app");
}

async function revalidateProjectPathsFromVersion(
  supabase: ReturnType<typeof createClient>,
  versionId: string,
) {
  const { data } = await supabase
    .from("project_deliverable_versions")
    .select("project_id")
    .eq("id", versionId)
    .maybeSingle();
  if (data?.project_id) revalidateProjectPaths(data.project_id);
}

async function revalidateProjectAndPublicPaths(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
) {
  revalidateProjectPaths(projectId);
  const { data: quote } = await supabase
    .from("quotes")
    .select("share_token")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (quote?.share_token) revalidatePath(`/q/${quote.share_token}`);
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
