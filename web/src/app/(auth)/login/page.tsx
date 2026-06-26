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
import { loginAction, type AuthResult } from "../actions";

export default function LoginPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await loginAction(formData);
      if (!nextResult.ok) setResult(nextResult);
    });
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card className="border-slate-200/60 shadow-xl backdrop-blur-sm bg-white/95 rounded-2xl overflow-hidden">
      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">Entrar</CardTitle>
        <CardDescription className="text-sm font-medium text-slate-500">
          Acesse seus orçamentos, obras, cobranças e margem em um só painel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-600">E-mail</Label>
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
              className="h-12 bg-slate-50 border-slate-200 focus:border-[#059669] focus:ring-[#059669] transition-colors"
            />
            {fieldErrors?.email?.[0] ? (
              <p id="login-email-error" className="text-sm font-medium text-red-500">
                {fieldErrors.email[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-600">Senha</Label>
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
              placeholder="••••••••"
              aria-invalid={Boolean(fieldErrors?.password)}
              aria-describedby={
                fieldErrors?.password ? "login-password-error" : undefined
              }
              className="h-12 bg-slate-50 border-slate-200 focus:border-[#059669] focus:ring-[#059669] transition-colors"
            />
            {fieldErrors?.password?.[0] ? (
              <p id="login-password-error" className="text-sm font-medium text-red-500">
                {fieldErrors.password[0]}
              </p>
            ) : null}
          </div>
          {result && !result.ok ? (
            <p
              className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg border border-red-100"
              role="alert"
              aria-live="polite"
            >
              {result.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full h-12 rounded-xl bg-[#059669] text-base font-bold shadow-lg shadow-[#059669]/20 transition-all hover:scale-[1.02] hover:bg-[#047857] hover:shadow-xl hover:shadow-[#059669]/30" disabled={pending}>
            {pending ? "Entrando…" : "Entrar no painel"}
          </Button>
          <p className="text-center text-sm font-medium text-slate-500 pt-4">
            Ainda não tem conta?{" "}
            <Link href="/signup" className="font-bold text-[#059669] hover:underline">
              Comece grátis
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
