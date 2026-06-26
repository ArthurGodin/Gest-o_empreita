"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientErrorFor, logServerError } from "@/lib/log";
import { normalizePaidPlan } from "@/lib/plans";

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  phone: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(2, "UF tem 2 letras")
    .optional()
    .or(z.literal("")),
});

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Converte string vazia em null para colunas opcionais. */
function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out) as (keyof T)[]) {
    if (out[key] === "") (out as Record<string, unknown>)[key as string] = null;
  }
  return out;
}

export async function createCompanyAction(
  formData: FormData,
): Promise<OnboardingResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    state: formData.get("state"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 1. Verifica sessão (RLS-scoped client).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  // 2. Guard: usuário só pode onboardar UMA vez.
  // Sem isso, qualquer replay (botão back+resubmit, duplo-click, request POST
  // direto) criaria companies extras via admin client (que bypassa RLS).
  const { data: existingMemberships, error: membershipError } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) {
    logServerError("onboarding.check-membership", membershipError);
    return { ok: false, error: clientErrorFor(membershipError) };
  }
  if (existingMemberships && existingMemberships.length > 0) {
    // Já onboardou — manda pro app. Não retorna erro.
    redirect("/app");
  }

  // 3. Bootstrap: cria company + membership via admin (RLS bypass justificado
  // porque o usuário ainda não é membro de nenhuma company).
  const admin = createAdminClient();
  const companyPayload = emptyToNull({
    ...parsed.data,
    state: parsed.data.state ? parsed.data.state.toUpperCase() : parsed.data.state,
  });

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert(companyPayload)
    .select("id")
    .single();

  if (companyError || !company) {
    logServerError("onboarding.create-company", companyError);
    return { ok: false, error: clientErrorFor(companyError) };
  }

  const companyId = company.id as string;

  const { error: memberError } = await admin.from("company_members").insert({
    company_id: companyId,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    logServerError("onboarding.create-membership", memberError);
    // Rollback: tenta remover a company órfã. Se ESTA também falhar, loga.
    const { error: rollbackError } = await admin
      .from("companies")
      .delete()
      .eq("id", companyId);
    if (rollbackError) {
      logServerError("onboarding.rollback", rollbackError);
    }
    return { ok: false, error: clientErrorFor(memberError) };
  }

  const plan = normalizePaidPlan(formData.get("plan")?.toString());

  revalidatePath("/", "layout");
  if (plan) {
    redirect(`/app/configuracoes/plano/checkout?plan=${plan}`);
  }
  redirect("/app");
}
