"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { uploadCompanyLogo } from "@/lib/supabase/storage";
import { clientErrorFor, logServerError } from "@/lib/log";

// ─── Update dados da empresa ────────────────────────────────────────────────

const companySchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  legal_name: z.string().trim().optional().or(z.literal("")),
  cnpj: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(2, "UF tem 2 letras")
    .optional()
    .or(z.literal("")),
  zip_code: z.string().trim().optional().or(z.literal("")),
});

export type CompanyActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out) as (keyof T)[]) {
    if (out[key] === "") (out as Record<string, unknown>)[key as string] = null;
  }
  return out;
}

export async function updateCompanyAction(
  input: z.infer<typeof companySchema>,
): Promise<CompanyActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const payload = emptyToNull({
    ...parsed.data,
    state: parsed.data.state ? parsed.data.state.toUpperCase() : parsed.data.state,
  });

  const supabase = createClient();
  const { error } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", company.company_id);

  if (error) {
    logServerError("config.update", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ─── Upload de logo ─────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export type LogoUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadCompanyLogoAction(
  formData: FormData,
): Promise<LogoUploadResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: "Formato não suportado. Use PNG, JPG ou WEBP.",
    };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "Arquivo muito grande. Máximo 2MB." };
  }

  // SR-#4: Lê o arquivo, valida magic bytes vs MIME, processa com sharp
  // (limitInputPixels protege contra decompression bombs).
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  if (!magicBytesMatchMime(inputBuffer, file.type)) {
    return {
      ok: false,
      error: "Esse arquivo não parece ser uma imagem PNG/JPG/WEBP válida.",
    };
  }

  let processed: Buffer;
  try {
    processed = await sharp(inputBuffer, {
      // 25M pixels (~25MP) é mais que suficiente pra logo de empresa e
      // bloqueia decompression bombs que se expandem pra GBs de RAM.
      limitInputPixels: 25_000_000,
      failOn: "warning",
    })
      .rotate() // honra orientação EXIF
      .resize(256, 256, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch (e) {
    logServerError("config.logo.resize", e);
    return { ok: false, error: "Arquivo de imagem inválido ou corrompido." };
  }

  const uploadResult = await uploadCompanyLogo(
    company.company_id,
    processed,
    "image/png",
  );

  if (!uploadResult.ok) {
    logServerError("config.logo.upload", uploadResult.error);
    return { ok: false, error: uploadResult.error };
  }

  // Atualiza companies.logo_url. Adiciona ?v={ts} pra invalidar cache do CDN.
  const supabase = createClient();
  const urlWithVersion = `${uploadResult.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase
    .from("companies")
    .update({ logo_url: urlWithVersion })
    .eq("id", company.company_id);

  if (error) {
    logServerError("config.logo.update-url", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/", "layout");
  return { ok: true, url: urlWithVersion };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Valida magic bytes do arquivo (4-12 primeiros bytes) contra o MIME type
 * declarado pelo cliente. Cliente pode mentir no MIME — magic bytes não.
 */
function magicBytesMatchMime(buf: Buffer, mime: string): boolean {
  if (buf.length < 12) return false;
  const m = mime.toLowerCase();

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;
  if (m === "image/png") return isPng;

  // JPEG: FF D8 FF
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (m === "image/jpeg" || m === "image/jpg") return isJpeg;

  // WEBP: RIFF....WEBP (bytes 0-3 = RIFF, 8-11 = WEBP)
  const isWebp =
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50;
  if (m === "image/webp") return isWebp;

  return false;
}
