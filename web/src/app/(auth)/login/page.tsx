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
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1.5 border-b">
        <CardTitle className="text-xl">
          Entrar
        </CardTitle>
        <CardDescription className="leading-6">
          Acesse seus orçamentos, obras, cobranças e margem em um só painel.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
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
              placeholder="contato@empresa.com.br…"
              aria-invalid={Boolean(fieldErrors?.email)}
              aria-describedby={fieldErrors?.email ? "login-email-error" : undefined}
            />
            {fieldErrors?.email?.[0] ? (
              <p id="login-email-error" className="text-sm text-destructive">
                {fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">
                Senha
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Esqueci a senha
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              spellCheck={false}
              required
              placeholder="Mínimo 6 caracteres…"
              aria-invalid={Boolean(fieldErrors?.password)}
              aria-describedby={
                fieldErrors?.password ? "login-password-error" : undefined
              }
            />
            {fieldErrors?.password?.[0] ? (
              <p id="login-password-error" className="text-sm text-destructive">
                {fieldErrors.password[0]}
              </p>
            ) : null}
          </div>

          {result && !result.ok ? (
            <p
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {result.error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Entrando…" : "Entrar no painel"}
          </Button>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link
              href="/signup"
              onClick={onSignupClick}
              className="font-semibold text-primary hover:underline"
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
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1.5 border-b">
        <CardTitle className="text-xl">
          Entrar
        </CardTitle>
        <CardDescription className="leading-6">
          Preparando acesso seguro ao painel.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="h-11 rounded-md bg-muted" />
          <div className="h-11 rounded-md bg-muted" />
          <div className="h-12 rounded-md bg-primary/10" />
        </div>
      </CardContent>
    </Card>
  );
}
