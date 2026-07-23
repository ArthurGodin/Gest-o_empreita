import type { AppPlan } from "@/lib/plans";
import type {
  ProjectDeliverableReviewAction,
  ProjectDeliverableSourceKind,
  ProjectDeliverableUploadState,
} from "@/lib/supabase/types";

export const DELIVERABLE_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const PROJECT_DELIVERABLES_BUCKET = "project-deliverables";
export const DELIVERABLE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type DeliverableAllowedMimeType =
  (typeof DELIVERABLE_ALLOWED_MIME_TYPES)[number];

export interface DeliverablePlanLimits {
  activePerProject: number;
  storageBytes: number;
}

export const DELIVERABLE_PLAN_LIMITS: Record<
  AppPlan,
  DeliverablePlanLimits
> = {
  free: {
    activePerProject: 3,
    storageBytes: 25 * 1024 * 1024,
  },
  pro: {
    activePerProject: 200,
    storageBytes: 1024 * 1024 * 1024,
  },
  ultimate: {
    activePerProject: 500,
    storageBytes: 5 * 1024 * 1024 * 1024,
  },
};

export type DeliverableDisplayState =
  | "draft"
  | "waiting_review"
  | "changes_requested"
  | "approved"
  | "archived";

export const DELIVERABLE_STATE_LABEL: Record<
  DeliverableDisplayState,
  string
> = {
  draft: "Rascunho",
  waiting_review: "Aguardando cliente",
  changes_requested: "Ajustes solicitados",
  approved: "Aprovado",
  archived: "Arquivado",
};

export interface DeliverableVersionStateInput {
  archivedAt: string | null;
  currentPublishedVersion: {
    reviewAction: ProjectDeliverableReviewAction | null;
  } | null;
}

export interface DeliveryAcceptanceItem {
  archivedAt: string | null;
  currentPublishedVersion: {
    reviewAction: ProjectDeliverableReviewAction | null;
  } | null;
}

export interface DeliverableFileValidation {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export type DeliverableValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; error: string };

export function getDeliverablePlanLimits(
  plan: AppPlan,
): DeliverablePlanLimits {
  return DELIVERABLE_PLAN_LIMITS[plan];
}

export function deriveDeliverableDisplayState(
  input: DeliverableVersionStateInput,
): DeliverableDisplayState {
  if (input.archivedAt) return "archived";
  if (!input.currentPublishedVersion) return "draft";

  if (input.currentPublishedVersion.reviewAction === "approved") {
    return "approved";
  }
  if (
    input.currentPublishedVersion.reviewAction === "changes_requested"
  ) {
    return "changes_requested";
  }
  return "waiting_review";
}

export function hasBlockingDeliverableReviews(
  deliverables: DeliveryAcceptanceItem[],
): boolean {
  return deliverables.some((deliverable) => {
    if (deliverable.archivedAt) return false;
    const current = deliverable.currentPublishedVersion;
    if (!current) return false;
    return current.reviewAction !== "approved";
  });
}

export function validateDeliverableFile(
  input: DeliverableFileValidation,
): DeliverableValidationResult<{
  fileName: string;
  mimeType: DeliverableAllowedMimeType;
  sizeBytes: number;
}> {
  const fileName = input.fileName.trim();

  if (
    fileName.length < 1 ||
    fileName.length > 240 ||
    /[/\\]/.test(fileName)
  ) {
    return {
      ok: false,
      code: "invalid_file_name",
      error: "Use um nome de arquivo válido com até 240 caracteres.",
    };
  }

  if (!isAllowedDeliverableMimeType(input.mimeType)) {
    return {
      ok: false,
      code: "invalid_mime",
      error: "Envie um arquivo PDF, JPG, PNG ou WEBP.",
    };
  }

  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes < 1 ||
    input.sizeBytes > DELIVERABLE_MAX_FILE_BYTES
  ) {
    return {
      ok: false,
      code: "invalid_size",
      error: "O arquivo deve ter no máximo 15 MB.",
    };
  }

  return {
    ok: true,
    value: {
      fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    },
  };
}

export function validateDeliverableExternalUrl(
  rawValue: string,
): DeliverableValidationResult<string> {
  const value = rawValue.trim();
  if (value.length < 1 || value.length > 2048) {
    return {
      ok: false,
      code: "invalid_url",
      error: "Informe um link HTTPS válido.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ok: false,
      code: "invalid_url",
      error: "Informe um link HTTPS válido.",
    };
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.hostname === ""
  ) {
    return {
      ok: false,
      code: "invalid_url",
      error: "Use um link HTTPS sem usuário ou senha incorporados.",
    };
  }

  return { ok: true, value: parsed.toString() };
}

export function isAllowedDeliverableMimeType(
  value: string,
): value is DeliverableAllowedMimeType {
  return (DELIVERABLE_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function formatStorageBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    const gigabytes = bytes / (1024 * 1024 * 1024);
    return `${formatStorageNumber(gigabytes)} GB`;
  }
  const megabytes = bytes / (1024 * 1024);
  return `${formatStorageNumber(megabytes)} MB`;
}

export function deliverableSourceLabel(
  sourceKind: ProjectDeliverableSourceKind,
): string {
  return sourceKind === "file" ? "Arquivo" : "Link externo";
}

export function deliverableUploadLabel(
  uploadState: ProjectDeliverableUploadState,
): string {
  return uploadState === "ready" ? "Pronto" : "Upload pendente";
}

function formatStorageNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value);
}
