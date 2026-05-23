"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(2, "Informe o nome da empresa"),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export type OnboardingResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

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

  // 1. Verificar sessão com o client normal (respeita RLS).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  // 2. Onboarding é bootstrap: o usuário ainda não é membro de nenhuma empresa.
  // Usamos o admin client (service role) para criar empresa + membership
  // de forma atômica. Justificado porque já validamos a sessão acima.
  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert(parsed.data)
    .select("id")
    .single();

  if (companyError || !company) {
    console.error("[onboarding] insert companies failed:", companyError);
    return {
      ok: false,
      error: `Erro ao criar empresa: ${companyError?.message ?? "desconhecido"} ${companyError?.code ? `(code ${companyError.code})` : ""}`,
    };
  }

  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id as string,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    console.error("[onboarding] insert company_members failed:", memberError);
    // Rollback manual: remove a company recém-criada para não deixar órfã
    await admin.from("companies").delete().eq("id", company.id as string);
    return {
      ok: false,
      error: `Empresa criada, mas erro ao vincular usuário: ${memberError.message} ${memberError.code ? `(code ${memberError.code})` : ""}`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/app");
}
