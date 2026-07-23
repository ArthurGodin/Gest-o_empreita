"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientErrorFor, logServerError, logServerEvent } from "@/lib/log";
import { normalizePaidPlan } from "@/lib/plans";
import { isBrazilStateCode } from "@/lib/brazil-states";
import { BUSINESS_SEGMENTS } from "@/lib/business-segment";

const schema = z.object({
  business_segment: z.enum(BUSINESS_SEGMENTS, {
    error: "Escolha como você trabalha",
  }),
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome profissional ou da empresa"),
  phone: z.string().trim().optional().or(z.literal("")),
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
});

export type OnboardingResult =
  | { ok: true; redirectTo: string }
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
  const plan = normalizePaidPlan(formData.get("plan")?.toString());
  const parsed = schema.safeParse({
    business_segment: formData.get("business_segment"),
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
    logServerEvent("onboarding.already_completed", {
      target_plan: plan ?? "free",
    });
    return { ok: true, redirectTo: "/app" };
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

  logServerEvent("onboarding.completed", {
    company_id: companyId,
    business_segment: parsed.data.business_segment,
    target_plan: plan ?? "free",
    redirects_to_checkout: Boolean(plan),
  });

  revalidatePath("/", "layout");
  if (plan) {
    return {
      ok: true,
      redirectTo: `/app/configuracoes/plano/checkout?plan=${plan}`,
    };
  }
  return { ok: true, redirectTo: "/app" };
}
