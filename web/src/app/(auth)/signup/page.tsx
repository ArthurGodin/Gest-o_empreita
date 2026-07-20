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
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1.5 border-b">
        <CardTitle className="text-xl">
          Criar conta
        </CardTitle>
        <CardDescription className="leading-6">
          Comece sem cartão e monte o primeiro orçamento com aparência
          profissional.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Seu nome
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="João da Silva…"
              aria-invalid={Boolean(fieldErrors?.name)}
              aria-describedby={fieldErrors?.name ? "signup-name-error" : undefined}
            />
            {fieldErrors?.name?.[0] ? (
              <p id="signup-name-error" className="text-sm text-destructive">
                {fieldErrors.name[0]}
              </p>
            ) : null}
          </div>

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
              aria-describedby={fieldErrors?.email ? "signup-email-error" : undefined}
            />
            {fieldErrors?.email?.[0] ? (
              <p id="signup-email-error" className="text-sm text-destructive">
                {fieldErrors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
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
              placeholder="Mínimo 6 caracteres…"
              aria-invalid={Boolean(fieldErrors?.password)}
              aria-describedby={
                fieldErrors?.password ? "signup-password-error" : undefined
              }
            />
            {fieldErrors?.password?.[0] ? (
              <p id="signup-password-error" className="text-sm text-destructive">
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
            {pending ? "Criando…" : "Criar minha conta"}
          </Button>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              href="/login"
              onClick={onLoginClick}
              className="font-semibold text-primary hover:underline"
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
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1.5 border-b">
        <CardTitle className="text-xl">
          Criar conta
        </CardTitle>
        <CardDescription className="leading-6">
          Preparando criação da sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="h-11 rounded-md bg-muted" />
          <div className="h-11 rounded-md bg-muted" />
          <div className="h-11 rounded-md bg-muted" />
          <div className="h-12 rounded-md bg-primary/10" />
        </div>
      </CardContent>
    </Card>
  );
}
