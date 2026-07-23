import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { PROJECT_DELIVERABLES_BUCKET } from "@/lib/deliverables";

/**
 * Helpers para upload/download em Supabase Storage.
 *
 * Logo da empresa: bucket público (`company-logos`). URL pública é estável
 * e direta (CDN do Supabase).
 *
 * PDF do orçamento: bucket privado (`quotes-pdf`). Streamamos via route
 * handler autenticado ou via admin client após validação de token.
 */

export const BUCKET_COMPANY_LOGOS = "company-logos";
export const BUCKET_QUOTES_PDF = "quotes-pdf";
export const BUCKET_DIARY_PHOTOS = "diary-photos";
export const BUCKET_PROJECT_DELIVERABLES = PROJECT_DELIVERABLES_BUCKET;

// ─── Logos ─────────────────────────────────────────────────────────────────

export async function uploadCompanyLogo(
  companyId: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  const ext = mimeToExt(contentType);
  if (!ext) {
    return { ok: false, error: "Formato de imagem não suportado (use PNG, JPG ou WEBP)." };
  }

  const path = `${companyId}.${ext}`;
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(BUCKET_COMPANY_LOGOS)
    .upload(path, buffer, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) return { ok: false, error: error.message };

  const { data } = admin.storage.from(BUCKET_COMPANY_LOGOS).getPublicUrl(path);
  return { ok: true, path, publicUrl: data.publicUrl };
}

export function getPublicLogoUrl(path: string): string {
  // Construído direto sem chamar Supabase (a estrutura é estável e o bucket é público).
  // Formato: <SUPABASE_URL>/storage/v1/object/public/<bucket>/<path>
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_COMPANY_LOGOS}/${path}`;
}

// ─── PDF de orçamento ──────────────────────────────────────────────────────

export async function uploadQuotePdf(
  quoteId: string,
  buffer: Buffer,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const path = `v3/${quoteId}.pdf`;
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(BUCKET_QUOTES_PDF)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "0", // PDF muda quando quote muda, sem cache HTTP
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

export async function downloadQuotePdf(
  path: string,
): Promise<{ ok: true; buffer: Buffer; lastModified: Date } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(BUCKET_QUOTES_PDF)
    .download(path);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "PDF não encontrado." };
  }

  const arrayBuffer = await data.arrayBuffer();
  return {
    ok: true,
    buffer: Buffer.from(arrayBuffer),
    // Supabase storage não retorna lastModified diretamente no download;
    // o caller pode comparar com quote.updated_at pra decidir invalidação.
    lastModified: new Date(),
  };
}

// ─── Fotos do diário (bucket privado) ──────────────────────────────────────

function randomSegment(): string {
  return Math.random().toString(36).slice(2, 8);
}

function uuidv4(): string {
  // crypto.randomUUID está disponível no runtime Node 18+ do Vercel.
  return globalThis.crypto.randomUUID();
}

export async function uploadDiaryPhoto(
  companyId: string,
  projectId: string,
  buffer: Buffer,
): Promise<{ ok: true; storage_path: string } | { ok: false; error: string }> {
  const folder = `${companyId}/${projectId}/upload-${Date.now()}-${randomSegment()}`;
  const path = `${folder}/${uuidv4()}.jpg`;
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(BUCKET_DIARY_PHOTOS)
    .upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "3600",
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storage_path: path };
}

/**
 * Gera URL assinada para uma foto do diário. Usada pelo link público e
 * pela rota autenticada de stream de foto.
 *
 * TTL default 1h.
 */
export async function signedDiaryPhotoUrl(
  storagePath: string,
  ttlSeconds = 3600,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET_DIARY_PHOTOS)
    .createSignedUrl(storagePath, ttlSeconds);

  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? "Foto não encontrada." };
  }
  return { ok: true, url: data.signedUrl };
}

export async function deleteDiaryPhotos(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const admin = createAdminClient();
  // Storage API aceita batch
  await admin.storage.from(BUCKET_DIARY_PHOTOS).remove(storagePaths);
}

// ─── Entregáveis de projeto (bucket privado) ───────────────────────────────

export async function createDeliverableSignedUpload(
  storagePath: string,
): Promise<
  | { ok: true; path: string; token: string }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET_PROJECT_DELIVERABLES)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error || !data?.token) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível autorizar o upload.",
    };
  }

  return { ok: true, path: data.path, token: data.token };
}

export async function getDeliverableFileInfo(
  storagePath: string,
): Promise<
  | { ok: true; sizeBytes: number; mimeType: string }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET_PROJECT_DELIVERABLES)
    .info(storagePath);

  const mimeType = normalizeStorageMimeType(
    data?.contentType ??
      (typeof data?.metadata?.mimetype === "string"
        ? data.metadata.mimetype
        : null),
  );

  if (
    error ||
    !data ||
    typeof data.size !== "number" ||
    !Number.isSafeInteger(data.size) ||
    !mimeType
  ) {
    return {
      ok: false,
      error: error?.message ?? "Arquivo enviado não encontrado.",
    };
  }

  return { ok: true, sizeBytes: data.size, mimeType };
}

export async function createDeliverableSignedDownload(
  storagePath: string,
  ttlSeconds = 90,
  downloadFileName?: string,
): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET_PROJECT_DELIVERABLES)
    .createSignedUrl(storagePath, ttlSeconds, {
      download: downloadFileName || false,
    });

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      error: error?.message ?? "Arquivo não encontrado.",
    };
  }

  return { ok: true, url: data.signedUrl };
}

export async function deleteDeliverableFile(
  storagePath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET_PROJECT_DELIVERABLES)
    .remove([storagePath]);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mimeToExt(mime: string): string | null {
  switch (mime.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function normalizeStorageMimeType(value: string | null | undefined) {
  const normalized = value?.split(";", 1)[0]?.trim().toLowerCase();
  return normalized || null;
}
