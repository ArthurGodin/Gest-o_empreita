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
import { requestPasswordResetAction, type AuthResult } from "../actions";

export default function ForgotPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await requestPasswordResetAction(formData);
      if (!nextResult.ok) {
        setResult(nextResult);
        return;
      }
      setSent(true);
    });
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Recuperar senha</CardTitle>
        <CardDescription>
          Informe o e-mail da conta. Se ele estiver cadastrado, enviaremos um
          link seguro para criar uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <div
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
              role="status"
              aria-live="polite"
            >
              Se o e-mail estiver cadastrado, o link de recuperação chegará em
              alguns instantes. Verifique a caixa de entrada e o spam.
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Voltar para o login</Link>
            </Button>
          </div>
        ) : (
          <form action={onSubmit} className="space-y-4">
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
                placeholder="contato@empresa.com.br…"
                aria-invalid={Boolean(fieldErrors?.email)}
                aria-describedby={
                  fieldErrors?.email ? "forgot-email-error" : undefined
                }
              />
              {fieldErrors?.email?.[0] ? (
                <p id="forgot-email-error" className="text-sm text-destructive">
                  {fieldErrors.email[0]}
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
              {pending ? "Enviando…" : "Enviar link de recuperação"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Lembrou a senha?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
