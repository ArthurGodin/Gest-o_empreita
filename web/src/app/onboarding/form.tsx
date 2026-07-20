"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, HardHat, MapPin, Phone } from "lucide-react";
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
import { trackProductEvent } from "@/lib/product-analytics";
import { createCompanyAction, type OnboardingResult } from "./actions";

const FIELD_ORDER = ["name", "phone", "city", "state"];

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const router = useRouter();
  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  useEffect(() => {
    if (!fieldErrors) return;
    const firstInvalidField = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (firstInvalidField) document.getElementById(firstInvalidField)?.focus();
  }, [fieldErrors]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const url = new URL(window.location.href);
      const plan = url.searchParams.get("plan");
      if (plan) formData.append("plan", plan);
      trackProductEvent("onboarding_submitted", {
        target_plan: plan === "pro" || plan === "ultimate" ? plan : "free",
      });

      try {
        const nextResult = await createCompanyAction(formData);
        if (!nextResult.ok) {
          trackProductEvent("onboarding_failed", {
            target_plan: plan === "pro" || plan === "ultimate" ? plan : "free",
            has_field_errors: Boolean(nextResult.fieldErrors),
          });
          setResult(nextResult);
          return;
        }

        trackProductEvent("onboarding_completed", {
          target_plan: plan === "pro" || plan === "ultimate" ? plan : "free",
          redirects_to_checkout: nextResult.redirectTo.includes("/checkout"),
        });
        router.push(nextResult.redirectTo);
        router.refresh();
      } catch {
        trackProductEvent("onboarding_failed", {
          target_plan: plan === "pro" || plan === "ultimate" ? plan : "free",
          thrown: true,
        });
        setResult({
          ok: false,
          error: "Não foi possível preparar seu painel agora. Tente novamente.",
        });
      }
    });
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:py-10">
        <header className="flex h-11 items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat aria-hidden="true" className="h-4 w-4" />
            </span>
            Prumo
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Configuração inicial
          </span>
        </header>

        <div className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-10 lg:pt-10">
          <section className="lg:pt-3">
            <p className="text-sm font-semibold text-primary">Sua empresa</p>
            <h1 className="mt-2 max-w-md text-balance text-2xl font-bold leading-tight sm:text-3xl">
              Prepare a identificação das suas propostas
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Comece pelo essencial. Você poderá completar logo, CNPJ e endereço
              nas configurações depois.
            </p>

            <ol className="mt-6 hidden space-y-4 border-l pl-5 lg:block">
              <li>
                <p className="text-sm font-semibold">1. Identifique a empresa</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nome e contato aparecem para o cliente.
                </p>
              </li>
              <li>
                <p className="text-sm font-semibold">2. Cadastre um cliente</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  O painel indicará essa ação ao entrar.
                </p>
              </li>
              <li>
                <p className="text-sm font-semibold">3. Envie a proposta</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recebimento será configurado apenas na hora de cobrar.
                </p>
              </li>
            </ol>
          </section>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Dados da empresa</CardTitle>
              <CardDescription>
                Apenas o nome é obrigatório para começar.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da empresa *</Label>
                  <div className="relative">
                    <Building2
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      autoComplete="organization"
                      placeholder="Ex.: Construtora Horizonte…"
                      aria-invalid={Boolean(fieldErrors?.name)}
                      aria-describedby={
                        fieldErrors?.name ? "onboarding-name-error" : undefined
                      }
                      className="pl-9"
                    />
                  </div>
                  {fieldErrors?.name?.[0] ? (
                    <p
                      id="onboarding-name-error"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.name[0]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp comercial</Label>
                  <div className="relative">
                    <Phone
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(11) 99999-0000…"
                      aria-invalid={Boolean(fieldErrors?.phone)}
                      aria-describedby="onboarding-phone-help onboarding-phone-error"
                      className="pl-9"
                    />
                  </div>
                  <p
                    id="onboarding-phone-help"
                    className="text-xs leading-5 text-muted-foreground"
                  >
                    Será mostrado como contato comercial nas propostas.
                  </p>
                  {fieldErrors?.phone?.[0] ? (
                    <p
                      id="onboarding-phone-error"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.phone[0]}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <div className="relative">
                      <MapPin
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="city"
                        name="city"
                        type="text"
                        autoComplete="address-level2"
                        placeholder="Fortaleza…"
                        aria-invalid={Boolean(fieldErrors?.city)}
                        aria-describedby={
                          fieldErrors?.city
                            ? "onboarding-city-error"
                            : undefined
                        }
                        className="pl-9"
                      />
                    </div>
                    {fieldErrors?.city?.[0] ? (
                      <p
                        id="onboarding-city-error"
                        className="text-sm text-destructive"
                      >
                        {fieldErrors.city[0]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">UF</Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      maxLength={2}
                      autoComplete="address-level1"
                      autoCapitalize="characters"
                      placeholder="CE…"
                      aria-invalid={Boolean(fieldErrors?.state)}
                      aria-describedby={
                        fieldErrors?.state ? "onboarding-state-error" : undefined
                      }
                      onInput={(event) => {
                        event.currentTarget.value =
                          event.currentTarget.value.toUpperCase();
                      }}
                    />
                    {fieldErrors?.state?.[0] ? (
                      <p
                        id="onboarding-state-error"
                        className="text-sm text-destructive"
                      >
                        {fieldErrors.state[0]}
                      </p>
                    ) : null}
                  </div>
                </div>

                {result && !result.ok ? (
                  <p
                    className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
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
                  {pending ? "Preparando painel…" : "Entrar no painel"}
                  {!pending ? <ArrowRight aria-hidden="true" /> : null}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
