"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ACTIVATION_GOALS,
  isActivationGoalAllowed,
  type ActivationGoal,
} from "@/lib/activation-goals";
import {
  getBusinessVocabulary,
  type BusinessSegment,
} from "@/lib/business-segment";
import { isValidCpfCnpj, normalizeCpfCnpj } from "@/lib/br-documents";
import { isBrazilStateCode } from "@/lib/brazil-states";
import { clientErrorFor, logServerError, logServerEvent } from "@/lib/log";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import { directProjectDestination } from "./direct-project-destination";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const schema = z
  .object({
    creation_key: z.string().uuid(),
    goal: z.enum(ACTIVATION_GOALS),
    customer_mode: z.enum(["existing", "new"]),
    existing_customer_id: z.string().uuid().nullable(),
    customer_name: optionalText(200),
    customer_document: optionalText(18),
    customer_phone: optionalText(30),
    customer_email: z
      .string()
      .trim()
      .email("Informe um email válido")
      .max(254)
      .optional()
      .or(z.literal("")),
    customer_address: optionalText(300),
    customer_city: optionalText(120),
    customer_state: optionalText(2),
    customer_zip_code: optionalText(10),
    project_name: z.string().trim().min(2, "Informe o nome do trabalho").max(200),
    project_description: optionalText(2_000),
    project_address: optionalText(300),
    project_status: z.enum(["planning", "in_progress"]),
    starts_on: z.string().date().nullable(),
    ends_on: z.string().date().nullable(),
    budget_cents: z.number().int().nonnegative().nullable(),
    template_id: z.string().uuid().nullable(),
  })
  .superRefine((data, context) => {
    if (data.customer_mode === "existing" && !data.existing_customer_id) {
      context.addIssue({
        code: "custom",
        path: ["existing_customer_id"],
        message: "Escolha um cliente",
      });
    }
    if (
      data.customer_mode === "new" &&
      (data.customer_name?.trim().length ?? 0) < 2
    ) {
      context.addIssue({
        code: "custom",
        path: ["customer_name"],
        message: "Informe o nome do cliente",
      });
    }
    const document = normalizeCpfCnpj(data.customer_document);
    if (data.customer_mode === "new" && document && !isValidCpfCnpj(document)) {
      context.addIssue({
        code: "custom",
        path: ["customer_document"],
        message: "Informe um CPF ou CNPJ válido",
      });
    }
    if (
      data.customer_mode === "new" &&
      data.customer_state &&
      !isBrazilStateCode(data.customer_state)
    ) {
      context.addIssue({
        code: "custom",
        path: ["customer_state"],
        message: "Informe uma UF válida",
      });
    }
    if (data.starts_on && data.ends_on && data.ends_on < data.starts_on) {
      context.addIssue({
        code: "custom",
        path: ["ends_on"],
        message: "A data final deve ser posterior ao início",
      });
    }
  });

export interface DirectProjectActionInput {
  creation_key: string;
  goal: ActivationGoal;
  customer_mode: "existing" | "new";
  existing_customer_id: string | null;
  customer_name?: string;
  customer_document?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_zip_code?: string;
  project_name: string;
  project_description?: string;
  project_address?: string;
  project_status: "planning" | "in_progress";
  starts_on: string | null;
  ends_on: string | null;
  budget_cents: number | null;
  template_id: string | null;
}

export type DirectProjectActionResult =
  | { ok: true; projectId: string; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createDirectProjectAction(
  input: DirectProjectActionInput,
): Promise<DirectProjectActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveCompany(),
  ]);
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  if (!membership) return { ok: false, error: "Empresa não encontrada." };

  const segment = membership.company.business_segment;
  if (
    parsed.data.goal === "sell" ||
    !isActivationGoalAllowed(parsed.data.goal, segment)
  ) {
    return {
      ok: false,
      error: "Esse caminho inicial não está disponível para sua área.",
      fieldErrors: { goal: ["Escolha um objetivo disponível"] },
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_direct_project", {
    p_company_id: membership.company_id,
    p_creation_key: parsed.data.creation_key,
    p_project_name: parsed.data.project_name,
    p_project_status: parsed.data.project_status,
    p_existing_customer_id:
      parsed.data.customer_mode === "existing"
        ? parsed.data.existing_customer_id
        : null,
    p_customer_name:
      parsed.data.customer_mode === "new" ? parsed.data.customer_name || null : null,
    p_customer_document:
      parsed.data.customer_mode === "new"
        ? normalizeCpfCnpj(parsed.data.customer_document) || null
        : null,
    p_customer_phone:
      parsed.data.customer_mode === "new" ? parsed.data.customer_phone || null : null,
    p_customer_email:
      parsed.data.customer_mode === "new" ? parsed.data.customer_email || null : null,
    p_customer_address:
      parsed.data.customer_mode === "new" ? parsed.data.customer_address || null : null,
    p_customer_city:
      parsed.data.customer_mode === "new" ? parsed.data.customer_city || null : null,
    p_customer_state:
      parsed.data.customer_mode === "new"
        ? parsed.data.customer_state?.toUpperCase() || null
        : null,
    p_customer_zip_code:
      parsed.data.customer_mode === "new" ? parsed.data.customer_zip_code || null : null,
    p_project_description: parsed.data.project_description || null,
    p_project_address: parsed.data.project_address || null,
    p_starts_on: parsed.data.starts_on,
    p_ends_on: parsed.data.ends_on,
    p_budget_cents: parsed.data.budget_cents,
    p_template_id: parsed.data.template_id,
  });

  const created = data?.[0];
  if (error || !created) {
    logServerError("projects.direct.create", error, {
      company_id: membership.company_id,
      business_segment: segment,
      activation_goal: parsed.data.goal,
    });
    return { ok: false, error: directProjectError(error, segment) };
  }

  logServerEvent("projects.direct.created", {
    company_id: membership.company_id,
    business_segment: segment,
    activation_goal: parsed.data.goal,
    used_existing_customer: parsed.data.customer_mode === "existing",
    used_template: Boolean(parsed.data.template_id),
  });

  revalidatePath("/app");
  revalidatePath("/app/clientes");
  revalidatePath("/app/obras");

  return {
    ok: true,
    projectId: created.created_project_id,
    redirectTo: directProjectDestination(
      created.created_project_id,
      parsed.data.goal,
    ),
  };
}

function directProjectError(error: unknown, segment: BusinessSegment): string {
  const message = ((error as { message?: string } | null)?.message ?? "").toLowerCase();
  if (message.includes("free_active_project_limit_reached")) {
    const vocabulary = getBusinessVocabulary(segment);
    return `O Plano Grátis permite 1 ${vocabulary.projectSingular.toLowerCase()} simultâneo. Conclua o atual ou assine o Pro para trabalhar sem esse limite.`;
  }
  if (message.includes("customer_not_available")) {
    return "O cliente selecionado não está mais disponível. Escolha outro.";
  }
  if (message.includes("template_not_available")) {
    return "O modelo selecionado não está mais disponível. Escolha outro.";
  }
  if (message.includes("invalid_project_dates")) {
    return "Confira as datas do trabalho.";
  }
  return clientErrorFor(error);
}
