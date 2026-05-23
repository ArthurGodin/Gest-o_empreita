"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente"),
  document: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().max(2, "UF tem 2 letras").optional().or(z.literal("")),
  zip_code: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CustomerActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Converte string vazia em null para colunas opcionais. */
function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out) as (keyof T)[]) {
    if (out[key] === "") (out as Record<string, unknown>)[key as string] = null;
  }
  return out;
}

/** Normaliza UF para uppercase. */
function normalizeData(data: z.infer<typeof customerSchema>) {
  return emptyToNull({
    ...data,
    state: data.state ? data.state.toUpperCase() : data.state,
  });
}

export async function createCustomerAction(
  formData: FormData,
): Promise<CustomerActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login." };

  const company = await getActiveCompany();
  if (!company) {
    return { ok: false, error: "Você ainda não tem empresa cadastrada." };
  }

  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...normalizeData(parsed.data),
      company_id: company.company_id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[customers] create failed:", error);
    return {
      ok: false,
      error: `Erro ao criar cliente: ${error?.message ?? "desconhecido"}`,
    };
  }

  revalidatePath("/app/clientes");
  return { ok: true, id: data.id as string };
}

export async function updateCustomerAction(
  id: string,
  formData: FormData,
): Promise<CustomerActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login." };

  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .update(normalizeData(parsed.data))
    .eq("id", id);

  if (error) {
    console.error("[customers] update failed:", error);
    return {
      ok: false,
      error: `Erro ao atualizar: ${error.message}`,
    };
  }

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${id}`);
  return { ok: true, id };
}

export async function deleteCustomerAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const supabase = createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    console.error("[customers] delete failed:", error);
    // FK restrict: cliente tem obras → mensagem amigável
    if (error.code === "23503") {
      return {
        ok: false,
        error: "Este cliente tem obras vinculadas. Apague as obras antes.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/clientes");
  return { ok: true };
}
