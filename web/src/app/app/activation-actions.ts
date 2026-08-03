"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ACTIVATION_GOALS,
  isActivationGoalAllowed,
  type ActivationGoal,
} from "@/lib/activation-goals";
import { clientErrorFor, logServerError, logServerEvent } from "@/lib/log";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  goal: z.enum(ACTIVATION_GOALS),
});

export type ActivationGoalActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateActivationGoalAction(input: {
  goal: ActivationGoal;
}): Promise<ActivationGoalActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Escolha um objetivo válido." };
  }

  const [user, membership] = await Promise.all([
    getCurrentUser(),
    getActiveCompany(),
  ]);
  if (!user) return { ok: false, error: "Sessão expirada." };
  if (!membership) return { ok: false, error: "Empresa não encontrada." };
  if (membership.role !== "owner" && membership.role !== "manager") {
    return {
      ok: false,
      error: "Somente responsáveis podem alterar o objetivo da empresa.",
    };
  }

  const segment = membership.company.business_segment;
  if (!isActivationGoalAllowed(parsed.data.goal, segment)) {
    return {
      ok: false,
      error: "Esse objetivo não está disponível para sua área profissional.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("companies")
    .update({ activation_goal: parsed.data.goal })
    .eq("id", membership.company_id);

  if (error) {
    logServerError("activation.goal.update", error, {
      company_id: membership.company_id,
      business_segment: segment,
    });
    return { ok: false, error: clientErrorFor(error) };
  }

  logServerEvent("activation.goal.updated", {
    company_id: membership.company_id,
    business_segment: segment,
    activation_goal: parsed.data.goal,
  });
  revalidatePath("/app");
  return { ok: true };
}
