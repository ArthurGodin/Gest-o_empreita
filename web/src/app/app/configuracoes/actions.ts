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

  // Lê o arquivo e faz resize com sharp pra 256x256 max (fit: inside).
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let processed: Buffer;
  try {
    processed = await sharp(inputBuffer)
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
