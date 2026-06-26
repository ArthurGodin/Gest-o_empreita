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
      const url = new URL(window.location.href);
      const plan = url.searchParams.get("plan");
      if (plan) formData.append("plan", plan);
      const nextResult = await signupAction(formData);
      if (!nextResult.ok) setResult(nextResult);
    });
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <Card className="border-slate-200/60 shadow-xl backdrop-blur-sm bg-white/95 rounded-2xl overflow-hidden">
      <CardHeader className="space-y-2 pb-6">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900">Criar conta</CardTitle>
        <CardDescription className="text-sm font-medium text-slate-500">
          Comece sem cartão e monte o primeiro orçamento com aparência profissional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-600">Seu nome</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="João da Silva"
              aria-invalid={Boolean(fieldErrors?.name)}
              aria-describedby={fieldErrors?.name ? "signup-name-error" : undefined}
              className="h-12 bg-slate-50 border-slate-200 focus:border-[#059669] focus:ring-[#059669] transition-colors"
            />
            {fieldErrors?.name?.[0] ? (
              <p id="signup-name-error" className="text-sm font-medium text-red-500">
                {fieldErrors.name[0]}
              </p>
            ) : null}
          </div>
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
              aria-describedby={fieldErrors?.email ? "signup-email-error" : undefined}
              className="h-12 bg-slate-50 border-slate-200 focus:border-[#059669] focus:ring-[#059669] transition-colors"
            />
            {fieldErrors?.email?.[0] ? (
              <p id="signup-email-error" className="text-sm font-medium text-red-500">
                {fieldErrors.email[0]}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-600">Senha</Label>
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
              className="h-12 bg-slate-50 border-slate-200 focus:border-[#059669] focus:ring-[#059669] transition-colors"
            />
            {fieldErrors?.password?.[0] ? (
              <p id="signup-password-error" className="text-sm font-medium text-red-500">
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
            {pending ? "Criando…" : "Criar minha conta"}
          </Button>
          <p className="text-center text-sm font-medium text-slate-500 pt-4">
            Já tem conta?{" "}
            <Link href="/login" className="font-bold text-[#059669] hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
