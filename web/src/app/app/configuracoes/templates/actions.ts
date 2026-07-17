"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { clientErrorFor, logServerError } from "@/lib/log";

export type TemplateActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type SimpleResult =
  | { ok: true }
  | { ok: false; error: string };

const itemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome da etapa não pode ser vazio")
    .max(200, "Nome muito longo"),
  est_days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .nullable(),
});

const templateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome do modelo não pode ser vazio")
    .max(100, "Nome muito longo"),
  description: z
    .string()
    .trim()
    .max(500, "Descrição muito longa")
    .optional()
    .or(z.literal("")),
  items: z.array(itemSchema).min(1, "Adicione ao menos 1 etapa").max(30),
});

async function requireCompany() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sessão expirada." };
  const company = await getActiveCompany();
  if (!company)
    return { ok: false as const, error: "Empresa não encontrada." };
  return { ok: true as const, companyId: company.company_id };
}

export async function createTemplateAction(payload: {
  name: string;
  description?: string;
  items: Array<{ name: string; est_days?: number | null }>;
}): Promise<TemplateActionResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = templateSchema.safeParse(payload);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Dados inválidos." };
  }

  const supabase = createClient();

  const { data: tpl, error: tplErr } = await supabase
    .from("stage_templates")
    .insert({
      company_id: auth.companyId,
      name: parsed.data.name,
      description:
        (parsed.data.description ?? "") === ""
          ? null
          : parsed.data.description!,
      is_system: false,
      position: 0,
    })
    .select("id")
    .single();

  if (tplErr || !tpl) {
    logServerError("templates.create.tpl", tplErr);
    return { ok: false, error: clientErrorFor(tplErr) };
  }

  const items = parsed.data.items.map((it, idx) => ({
    template_id: tpl.id as string,
    position: idx,
    name: it.name,
    est_days: it.est_days ?? null,
  }));

  const { error: itemsErr } = await supabase
    .from("stage_template_items")
    .insert(items);

  if (itemsErr) {
    // Rollback do template
    await supabase.from("stage_templates").delete().eq("id", tpl.id);
    logServerError("templates.create.items", itemsErr);
    return { ok: false, error: clientErrorFor(itemsErr) };
  }

  revalidatePath("/app/configuracoes/templates");
  return { ok: true, id: tpl.id as string };
}

export async function updateTemplateAction(
  templateId: string,
  payload: {
    name: string;
    description?: string;
    items: Array<{ name: string; est_days?: number | null }>;
  },
): Promise<SimpleResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const parsed = templateSchema.safeParse(payload);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Dados inválidos." };
  }

  const supabase = createClient();

  // Confere ownership (não-system + same company)
  const { data: existing } = await supabase
    .from("stage_templates")
    .select("id, is_system")
    .eq("id", templateId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Modelo não encontrado." };
  if ((existing as { is_system: boolean }).is_system) {
    return { ok: false, error: "Modelos prontos do Prumo não podem ser editados." };
  }

  const { error: updErr } = await supabase
    .from("stage_templates")
    .update({
      name: parsed.data.name,
      description:
        (parsed.data.description ?? "") === ""
          ? null
          : parsed.data.description!,
    })
    .eq("id", templateId)
    .eq("company_id", auth.companyId);

  if (updErr) {
    logServerError("templates.update", updErr);
    return { ok: false, error: clientErrorFor(updErr) };
  }

  // Substitui items: delete all + insert
  await supabase
    .from("stage_template_items")
    .delete()
    .eq("template_id", templateId);

  const items = parsed.data.items.map((it, idx) => ({
    template_id: templateId,
    position: idx,
    name: it.name,
    est_days: it.est_days ?? null,
  }));

  const { error: insErr } = await supabase
    .from("stage_template_items")
    .insert(items);

  if (insErr) {
    logServerError("templates.update.items", insErr);
    return { ok: false, error: clientErrorFor(insErr) };
  }

  revalidatePath("/app/configuracoes/templates");
  return { ok: true };
}

export async function deleteTemplateAction(
  templateId: string,
): Promise<SimpleResult> {
  const auth = await requireCompany();
  if (!auth.ok) return auth;

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("stage_templates")
    .select("id, is_system")
    .eq("id", templateId)
    .eq("company_id", auth.companyId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Modelo não encontrado." };
  if ((existing as { is_system: boolean }).is_system) {
    return { ok: false, error: "Modelos prontos do Prumo não podem ser apagados." };
  }

  // Bloqueia delete se template está em uso por algum project
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Esse modelo está em uso em ${count} obra${count === 1 ? "" : "s"}. Desvincule antes de apagar.`,
    };
  }

  const { error } = await supabase
    .from("stage_templates")
    .delete()
    .eq("id", templateId)
    .eq("company_id", auth.companyId);

  if (error) {
    logServerError("templates.delete", error);
    return { ok: false, error: clientErrorFor(error) };
  }

  revalidatePath("/app/configuracoes/templates");
  return { ok: true };
}
