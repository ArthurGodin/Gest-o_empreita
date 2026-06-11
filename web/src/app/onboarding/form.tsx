"use client";

import { useState, useTransition } from "react";
import { Building2, CheckCircle2, HardHat, MapPin, Phone } from "lucide-react";
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
import { createCompanyAction, type OnboardingResult } from "./actions";

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OnboardingResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await createCompanyAction(formData);
      if (!nextResult.ok) setResult(nextResult);
    });
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  return (
    <main className="min-h-svh bg-[#f8f4ee]">
      <div className="mx-auto grid min-h-svh w-full max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-8 lg:px-8 lg:py-6">
        <section className="space-y-6 lg:space-y-8">
          <div className="flex items-center gap-2 text-lg font-semibold text-[#20160f]">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ff6a00] text-white shadow-sm">
              <HardHat className="h-5 w-5" />
            </div>
            Gestão Empreita
          </div>

          <div className="max-w-xl space-y-4">
            <p className="w-fit rounded-full border border-[#e7d8c8] bg-white/70 px-3 py-1 text-xs font-medium text-[#7a4a23]">
              Setup rápido para vender pelo WhatsApp
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-[#20160f] sm:text-4xl lg:text-5xl">
              Deixe sua empresa pronta para enviar o primeiro orçamento bonito.
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#6f5a49]">
              Agora só precisamos dos dados que aparecem na proposta. Depois você
              cadastra cliente, monta orçamento e manda o link de aprovação.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
            {[
              {
                title: "1. Empresa",
                detail: "Nome e contato no orçamento.",
              },
              {
                title: "2. Cliente",
                detail: "Cadastro rápido antes da proposta.",
              },
              {
                title: "3. Link",
                detail: "WhatsApp com aprovação digital.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-lg border border-[#eadbcc] bg-white/75 p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#20160f]">
                  <CheckCircle2 className="h-4 w-4 text-[#ff6a00]" />
                  {step.title}
                </div>
                <p className="mt-1 text-xs leading-5 text-[#6f5a49]">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Card className="w-full rounded-lg border-[#e5d7c7] bg-white shadow-xl shadow-[#8a4a1f]/10">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Dados da empresa</CardTitle>
            <CardDescription>
              Preencha o essencial. Tudo pode ser ajustado depois em Configurações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da empresa *</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Ex: Coberturas do Léo"
                    autoFocus
                    aria-invalid={Boolean(fieldErrors?.name)}
                    aria-describedby={fieldErrors?.name ? "name-error" : undefined}
                    className="pl-9"
                  />
                </div>
                {fieldErrors?.name?.[0] && (
                  <p id="name-error" className="text-sm text-destructive">
                    {fieldErrors.name[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone comercial</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(11) 99999-0000"
                    aria-invalid={Boolean(fieldErrors?.phone)}
                    aria-describedby="phone-help"
                    className="pl-9"
                  />
                </div>
                <p id="phone-help" className="text-xs text-muted-foreground">
                  Use o WhatsApp que o cliente deve chamar depois de aprovar.
                </p>
                {fieldErrors?.phone?.[0] && (
                  <p className="text-sm text-destructive">{fieldErrors.phone[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="São Paulo"
                      aria-invalid={Boolean(fieldErrors?.city)}
                      className="pl-9"
                    />
                  </div>
                  {fieldErrors?.city?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.city[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">UF</Label>
                  <Input
                    id="state"
                    name="state"
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    aria-invalid={Boolean(fieldErrors?.state)}
                    onInput={(event) => {
                      event.currentTarget.value =
                        event.currentTarget.value.toUpperCase();
                    }}
                  />
                  {fieldErrors?.state?.[0] && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.state[0]}
                    </p>
                  )}
                </div>
              </div>

              {result && !result.ok && (
                <p className="text-sm text-destructive" role="alert">
                  {result.error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={pending}>
                {pending ? "Criando empresa..." : "Entrar no painel"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
