"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert(parsed.data)
    .select("id")
    .single();

  if (companyError || !company) {
    return {
      ok: false,
      error: "Não foi possível criar a empresa. Tente novamente.",
    };
  }

  const { error: memberError } = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return {
      ok: false,
      error: "Empresa criada, mas não foi possível vincular o usuário.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/app");
}
