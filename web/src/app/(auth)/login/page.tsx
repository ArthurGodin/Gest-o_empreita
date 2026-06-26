"use client";

import { Suspense, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type AuthResult } from "../actions";

function paidPlanFromRedirect(value: string | null): "pro" | "ultimate" | null {
  if (!value) return null;
  try {
    const url = new URL(value, "https://prumo.local");
    const plan = url.searchParams.get("plan");
    return plan === "pro" || plan === "ultimate" ? plan : null;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const selectedPlan =
    searchParams.get("plan") ?? paidPlanFromRedirect(redirectParam);

  function onSubmit(formData: FormData) {
    setResult(null);
    if (redirectParam) formData.append("redirect", redirectParam);

    startTransition(async () => {
      const nextResult = await loginAction(formData);
      if (!nextResult.ok) setResult(nextResult);
    });
  }

  function onSignupClick(event: MouseEvent<HTMLAnchorElement>) {
    if (selectedPlan !== "pro" && selectedPlan !== "ultimate") return;
    event.preventDefault();
    router.push(`/signup?plan=${selectedPlan}`);
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
          Entrar
        </CardTitle>
        <CardDescription className="text-sm font-medium text-slate-500">
          Acesse seus orçamentos, obras, cobranças e margem em um só painel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              spellCheck={false}
              required
              placeholder="contato@empresa.com.br"
              aria-invalid={Boolean(fieldErrors?.email)}
              aria-describedby={fieldErrors?.email ? "login-email-error" : undefined}
              className="h-12 border-slate-200 bg-slate-50 transition-colors focus:border-[#059669] focus:ring-[#059669]"
            />
            {fieldErrors?.email?.[0] ? (
              <p id="login-email-error" className="text-sm font-medium text-red-500">
                {fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="password"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Senha
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-[#059669] hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              spellCheck={false}
              required
              placeholder="Mínimo 6 caracteres"
              aria-invalid={Boolean(fieldErrors?.password)}
              aria-describedby={
                fieldErrors?.password ? "login-password-error" : undefined
              }
              className="h-12 border-slate-200 bg-slate-50 transition-colors focus:border-[#059669] focus:ring-[#059669]"
            />
            {fieldErrors?.password?.[0] ? (
              <p id="login-password-error" className="text-sm font-medium text-red-500">
                {fieldErrors.password[0]}
              </p>
            ) : null}
          </div>

          {result && !result.ok ? (
            <p
              className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-500"
              role="alert"
              aria-live="polite"
            >
              {result.error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-[#059669] text-base font-bold shadow-lg shadow-[#059669]/20 transition-all hover:scale-[1.02] hover:bg-[#047857] hover:shadow-xl hover:shadow-[#059669]/30"
            disabled={pending}
          >
            {pending ? "Entrando..." : "Entrar no painel"}
          </Button>

          <p className="pt-4 text-center text-sm font-medium text-slate-500">
            Ainda não tem conta?{" "}
            <Link
              href="/signup"
              onClick={onSignupClick}
              className="font-bold text-[#059669] hover:underline"
            >
              Comece grátis
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function LoginFallback() {
  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/60 bg-white/95 shadow-xl backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
          Entrar
        </CardTitle>
        <CardDescription className="text-sm font-medium text-slate-500">
          Preparando acesso seguro ao painel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-emerald-100" />
        </div>
      </CardContent>
    </Card>
  );
}
