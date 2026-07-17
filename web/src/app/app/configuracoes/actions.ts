"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { uploadCompanyLogo } from "@/lib/supabase/storage";
import { clientErrorFor, logServerError } from "@/lib/log";
import { normalizePixKey } from "@/lib/pix/br-code";
import { isValidCpfCnpj } from "@/lib/br-documents";
import { isBrazilStateCode } from "@/lib/brazil-states";

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
    .refine(
      (value): boolean => value === "" || isBrazilStateCode(value),
      "Selecione uma UF valida",
    )
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


const paymentSchema = z
  .object({
    payment_provider: z.enum(["manual_pix", "asaas"]),
    pix_key_type: z
      .enum(["cpf", "cnpj", "phone", "email", "random"])
      .optional()
      .nullable(),
    pix_key: z.string().trim().max(120).optional().or(z.literal("")),
    pix_receiver_name: z.string().trim().max(80).optional().or(z.literal("")),
    pix_receiver_city: z.string().trim().max(80).optional().or(z.literal("")),
    pix_instructions: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.payment_provider !== "manual_pix") return;

    if (!value.pix_key_type) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_key_type"],
        message: "Escolha o tipo da chave Pix.",
      });
    }
    if (!value.pix_key?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_key"],
        message: "Informe a chave Pix.",
      });
    }
    if (!value.pix_receiver_name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_receiver_name"],
        message: "Informe o nome que aparece no banco.",
      });
    }
    if (!value.pix_receiver_city?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_receiver_city"],
        message: "Informe a cidade do recebedor.",
      });
    }

    const normalizedKey = value.pix_key_type
      ? normalizePixKey(value.pix_key ?? "", value.pix_key_type)
      : "";
    if (
      value.pix_key_type === "cpf" &&
      (normalizedKey.length !== 11 || !isValidCpfCnpj(normalizedKey))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_key"],
        message: "CPF da chave Pix inválido.",
      });
    }
    if (
      value.pix_key_type === "cnpj" &&
      (normalizedKey.length !== 14 || !isValidCpfCnpj(normalizedKey))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_key"],
        message: "CNPJ da chave Pix inválido.",
      });
    }
    if (value.pix_key_type === "email" && !z.email().safeParse(normalizedKey).success) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_key"],
        message: "Email da chave Pix inválido.",
      });
    }
    if (value.pix_key_type === "phone" && normalizedKey.length < 12) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_key"],
        message: "Telefone Pix precisa incluir DDD.",
      });
    }
    if (value.pix_key_type === "random" && normalizedKey.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["pix_key"],
        message: "Chave aleatória muito curta.",
      });
    }
  });

export async function updatePaymentSettingsAction(
  input: z.infer<typeof paymentSchema>,
): Promise<CompanyActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const company = await getActiveCompany();
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os dados de recebimento.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const payload = {
    payment_provider: parsed.data.payment_provider,
    pix_key_type:
      parsed.data.payment_provider === "manual_pix"
        ? parsed.data.pix_key_type
        : null,
    pix_key:
      parsed.data.payment_provider === "manual_pix"
        ? normalizePixKey(parsed.data.pix_key ?? "", parsed.data.pix_key_type!)
        : null,
    pix_receiver_name:
      parsed.data.payment_provider === "manual_pix"
        ? parsed.data.pix_receiver_name?.trim()
        : null,
    pix_receiver_city:
      parsed.data.payment_provider === "manual_pix"
        ? parsed.data.pix_receiver_city?.trim()
        : null,
    pix_instructions:
      parsed.data.payment_provider === "manual_pix"
        ? parsed.data.pix_instructions?.trim() || null
        : null,
  };

  const supabase = createClient();
  const { error } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", company.company_id);

  if (error) {
    logServerError("config.payment.update", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/", "layout");
  revalidatePath("/app/configuracoes");
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
