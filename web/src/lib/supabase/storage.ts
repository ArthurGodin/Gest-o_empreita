import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

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
  const path = `${quoteId}.pdf`;
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
