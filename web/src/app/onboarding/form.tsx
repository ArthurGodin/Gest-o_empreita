"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  HardHat,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
    <main className="relative min-h-svh overflow-hidden bg-[#f6f8fb] text-[#17202a]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(31,41,55,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(31,41,55,0.045)_1px,transparent_1px)] bg-[length:32px_32px]"
      />
      <div className="relative mx-auto grid min-h-svh w-full max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-8 lg:px-8 lg:py-6">
        <section className="space-y-6 lg:space-y-8">
          <div className="flex items-center gap-2 text-lg font-semibold text-[#17202a]">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#df6b21] text-white shadow-sm">
              <HardHat className="h-5 w-5" />
            </div>
            Gestão Empreita
          </div>

          <div className="max-w-xl space-y-4">
            <p className="inline-flex items-center gap-2 rounded-md border border-[#223044] bg-[#17202a] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Primeira proposta com cara de empresa grande
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-[#17202a] sm:text-4xl lg:text-5xl">
              Deixe o painel pronto para vender, aprovar e cobrar sem improviso.
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#52606f]">
              Esses dados aparecem no orçamento, no link público e no
              acompanhamento da obra. Preencha o essencial agora; o resto entra
              quando ajudar a fechar a primeira venda.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
            {[
              {
                title: "Marca",
                detail: "Nome e contato certos no orçamento.",
              },
              {
                title: "Confiança",
                detail: "Cliente decide em um link limpo.",
              },
              {
                title: "Dinheiro",
                detail: "Aprovou, virou obra e entrada Pix.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-lg border border-[#d8e0ea] bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
                  <CheckCircle2 className="h-4 w-4 text-[#218653]" />
                  {step.title}
                </div>
                <p className="mt-1 text-xs leading-5 text-[#52606f]">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="max-w-xl rounded-lg border border-[#cfe8d7] bg-[#f0fbf4] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#218653]" />
              <div>
                <p className="text-sm font-semibold text-[#17202a]">
                  Onboarding curto, valor rápido.
                </p>
                <p className="mt-1 text-sm leading-6 text-[#486354]">
                  Logo, CNPJ, endereço completo e modelos de etapa podem ser
                  refinados depois. Agora o objetivo é chegar rápido ao primeiro
                  orçamento vendável.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Card className="w-full rounded-lg border-[#d8e0ea] bg-white shadow-xl shadow-slate-900/10">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Identidade de venda</CardTitle>
            <CardDescription>
              O mínimo para o cliente reconhecer quem está enviando a proposta.
              Você pode melhorar tudo depois em Configurações.
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
                {pending ? (
                  "Preparando painel..."
                ) : (
                  <>
                    Entrar no painel
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
