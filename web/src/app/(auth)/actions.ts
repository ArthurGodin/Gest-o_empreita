"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { logServerError } from "@/lib/log";
import { normalizePaidPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha precisa ter pelo menos 6 caracteres"),
  redirect: z.string().optional(),
});

const signupSchema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha precisa ter pelo menos 6 caracteres"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme sua nova senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function safeInternalAppRedirect(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/app")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

function paidPlanFromCheckoutRedirect(
  value: string | null,
): "pro" | "ultimate" | null {
  if (!value) return null;
  try {
    const url = new URL(value, "https://prumo.local");
    if (url.pathname !== "/app/configuracoes/plano/checkout") return null;
    return normalizePaidPlan(url.searchParams.get("plan"));
  } catch {
    return null;
  }
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirect: formData.get("redirect")?.toString(),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  revalidatePath("/", "layout");
  const redirectTo = safeInternalAppRedirect(parsed.data.redirect);
  const targetPlan = paidPlanFromCheckoutRedirect(redirectTo);

  if (targetPlan) {
    const { data: memberships, error: membershipError } = await supabase
      .from("company_members")
      .select("company_id")
      .limit(1);

    if (!membershipError && (!memberships || memberships.length === 0)) {
      redirect(`/onboarding?plan=${targetPlan}`);
    }
  }

  redirect(redirectTo ?? "/app");
}

export async function signupAction(formData: FormData): Promise<AuthResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
    },
  });

  if (error) {
    logServerError("auth.signup", error);
    return {
      ok: false,
      error:
        "Não foi possível criar a conta. Verifique os dados ou tente novamente.",
    };
  }

  const plan = normalizePaidPlan(formData.get("plan")?.toString());

  revalidatePath("/", "layout");
  redirect(plan ? `/onboarding?plan=${plan}` : "/onboarding");
}

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Informe um e-mail válido.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    logServerError("auth.password-reset.request", error);
  }

  return { ok: true };
}

export async function updatePasswordAction(
  formData: FormData,
): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira a nova senha.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logServerError("auth.password-reset.update", error);
    return {
      ok: false,
      error:
        "Link expirado ou sessão inválida. Peça um novo link de recuperação.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function signoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
