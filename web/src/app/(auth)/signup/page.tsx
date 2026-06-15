"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, type AuthResult } from "../actions";

export default function SignupPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await signupAction(formData);
      if (!nextResult.ok) setResult(nextResult);
    });
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Criar conta</CardTitle>
        <CardDescription>
          Comece sem cartão e monte o primeiro orçamento com aparência
          profissional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Seu nome</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="João da Silva"
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
            <Label htmlFor="email">E-mail</Label>
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
            />
            {fieldErrors?.email?.[0] ? (
              <p id="signup-email-error" className="text-sm text-destructive">
                {fieldErrors.email[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
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
            />
            {fieldErrors?.password?.[0] ? (
              <p id="signup-password-error" className="text-sm text-destructive">
                {fieldErrors.password[0]}
              </p>
            ) : null}
          </div>
          {result && !result.ok ? (
            <p
              className="text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {result.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando…" : "Criar minha conta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
