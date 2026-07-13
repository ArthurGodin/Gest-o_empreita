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
import { trackProductEvent } from "@/lib/product-analytics";
import { signupAction, type AuthResult } from "../actions";

function normalizePlan(value: string | null): "pro" | "ultimate" | null {
  return value === "pro" || value === "ultimate" ? value : null;
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = normalizePlan(searchParams.get("plan"));

  function onSubmit(formData: FormData) {
    setResult(null);
    if (selectedPlan) formData.append("plan", selectedPlan);
    trackProductEvent("signup_form_submitted", {
      target_plan: selectedPlan ?? "free",
    });

    startTransition(async () => {
      const nextResult = await signupAction(formData);
      if (!nextResult.ok) {
        trackProductEvent("signup_failed", {
          target_plan: selectedPlan ?? "free",
          has_field_errors: Boolean(nextResult.fieldErrors),
        });
        setResult(nextResult);
      }
    });
  }

  function onLoginClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!selectedPlan) return;
    event.preventDefault();
    router.push(`/login?plan=${selectedPlan}`);
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card className="overflow-hidden rounded-[1.25rem] border-slate-200/60 bg-white/95 shadow-xl backdrop-blur-sm sm:rounded-2xl">
      <CardHeader className="space-y-2 p-5 pb-4 sm:p-6 sm:pb-6">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
          Criar conta
        </CardTitle>
        <CardDescription className="text-sm font-medium leading-6 text-slate-500">
          Comece sem cartão e monte o primeiro orçamento com aparência
          profissional.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <form action={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Seu nome
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="João da Silva"
              aria-invalid={Boolean(fieldErrors?.name)}
              aria-describedby={fieldErrors?.name ? "signup-name-error" : undefined}
              className="h-[3.25rem] border-slate-200 bg-slate-50 text-base transition-colors focus:border-[#059669] focus:ring-[#059669]"
            />
            {fieldErrors?.name?.[0] ? (
              <p id="signup-name-error" className="text-sm font-medium text-red-500">
                {fieldErrors.name[0]}
              </p>
            ) : null}
          </div>

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
              aria-describedby={fieldErrors?.email ? "signup-email-error" : undefined}
              className="h-[3.25rem] border-slate-200 bg-slate-50 text-base transition-colors focus:border-[#059669] focus:ring-[#059669]"
            />
            {fieldErrors?.email?.[0] ? (
              <p id="signup-email-error" className="text-sm font-medium text-red-500">
                {fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wider text-slate-600"
            >
              Senha
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              aria-invalid={Boolean(fieldErrors?.password)}
              aria-describedby={
                fieldErrors?.password ? "signup-password-error" : undefined
              }
              className="h-[3.25rem] border-slate-200 bg-slate-50 text-base transition-colors focus:border-[#059669] focus:ring-[#059669]"
            />
            {fieldErrors?.password?.[0] ? (
              <p id="signup-password-error" className="text-sm font-medium text-red-500">
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
            className="h-[3.25rem] w-full rounded-xl bg-[#059669] text-base font-bold shadow-lg shadow-[#059669]/20 transition-all hover:scale-[1.02] hover:bg-[#047857] hover:shadow-xl hover:shadow-[#059669]/30"
            disabled={pending}
          >
            {pending ? "Criando..." : "Criar minha conta"}
          </Button>

          <p className="pt-4 text-center text-sm font-medium text-slate-500">
            Já tem conta?{" "}
            <Link
              href="/login"
              onClick={onLoginClick}
              className="font-bold text-[#059669] hover:underline"
            >
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function SignupFallback() {
  return (
    <Card className="overflow-hidden rounded-[1.25rem] border-slate-200/60 bg-white/95 shadow-xl backdrop-blur-sm sm:rounded-2xl">
      <CardHeader className="space-y-2 p-5 pb-4 sm:p-6 sm:pb-6">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
          Criar conta
        </CardTitle>
        <CardDescription className="text-sm font-medium leading-6 text-slate-500">
          Preparando criação da sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="space-y-4">
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-slate-100" />
          <div className="h-12 rounded-xl bg-emerald-100" />
        </div>
      </CardContent>
    </Card>
  );
}
