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
import { updatePasswordAction, type AuthResult } from "../actions";

export default function ResetPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await updatePasswordAction(formData);
      if (!nextResult.ok) setResult(nextResult);
    });
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Nova senha</CardTitle>
        <CardDescription>
          Use pelo menos 8 caracteres para voltar ao painel com segurança.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              aria-invalid={Boolean(fieldErrors?.password)}
              aria-describedby={
                fieldErrors?.password ? "reset-password-error" : undefined
              }
            />
            {fieldErrors?.password?.[0] ? (
              <p id="reset-password-error" className="text-sm text-destructive">
                {fieldErrors.password[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              required
              minLength={8}
              placeholder="Digite a senha novamente"
              aria-invalid={Boolean(fieldErrors?.confirmPassword)}
              aria-describedby={
                fieldErrors?.confirmPassword
                  ? "reset-confirm-password-error"
                  : undefined
              }
            />
            {fieldErrors?.confirmPassword?.[0] ? (
              <p
                id="reset-confirm-password-error"
                className="text-sm text-destructive"
              >
                {fieldErrors.confirmPassword[0]}
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
            {pending ? "Salvando…" : "Salvar nova senha"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Link expirado?{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-primary hover:underline"
            >
              Pedir outro link
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
