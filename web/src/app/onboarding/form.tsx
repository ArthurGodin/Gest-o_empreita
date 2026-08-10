"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  HardHat,
  MapPin,
  Phone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BusinessSegmentPicker } from "@/components/business-segment-picker";
import { ActivationGoalPicker } from "@/components/activation-goal-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acquisitionContextFromSearchParams } from "@/lib/acquisition-context";
import { trackProductEvent } from "@/lib/product-analytics";
import type { BusinessSegment } from "@/lib/business-segment";
import type { ActivationGoal } from "@/lib/activation-goals";
import { isBrazilStateCode } from "@/lib/brazil-states";
import {
  MARKETING_CONSENT_CHANGED_EVENT,
  marketingConsentFromCookieHeader,
} from "@/lib/marketing-consent";
import { createCompanyAction, type OnboardingResult } from "./actions";

const FIELD_ORDER = [
  "business_segment",
  "name",
  "phone",
  "city",
  "state",
  "activation_goal",
];

type OnboardingStep = "profile" | "goal";

export function OnboardingForm({
  initialBusinessSegment,
  initialSignupEventId,
  metaConfigured,
}: {
  initialBusinessSegment?: BusinessSegment;
  initialSignupEventId?: string;
  metaConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [businessSegment, setBusinessSegment] = useState<
    BusinessSegment | undefined
  >(initialBusinessSegment);
  const [activationGoal, setActivationGoal] = useState<
    ActivationGoal | undefined
  >();
  const [step, setStep] = useState<OnboardingStep>("profile");
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  useEffect(() => {
    if (!fieldErrors) return;
    const firstInvalidField = FIELD_ORDER.find((field) => fieldErrors[field]);
    window.requestAnimationFrame(() => {
      if (
        firstInvalidField === "business_segment" ||
        firstInvalidField === "activation_goal"
      ) {
        document
          .querySelector<HTMLInputElement>(
            `input[name="${firstInvalidField}"]`,
          )
          ?.focus();
        return;
      }
      if (firstInvalidField) document.getElementById(firstInvalidField)?.focus();
    });
  }, [fieldErrors]);

  useEffect(() => {
    trackProductEvent("onboarding_step_viewed", { step });
  }, [step]);

  useEffect(() => {
    if (!initialSignupEventId) return;
    let completed = false;

    const flushSignupConversion = () => {
      if (completed) return;
      const consent = marketingConsentFromCookieHeader(document.cookie);
      if (metaConfigured && consent === null) return;

      const url = new URL(window.location.href);
      const { plan } = acquisitionContextFromSearchParams(url.searchParams);
      trackProductEvent(
        "signup_completed",
        {
          target_plan:
            plan ?? "free",
        },
        { eventId: initialSignupEventId },
      );
      completed = true;
      url.searchParams.delete("signup_event_id");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    };

    flushSignupConversion();
    window.addEventListener(
      MARKETING_CONSENT_CHANGED_EVENT,
      flushSignupConversion,
    );
    return () => {
      window.removeEventListener(
        MARKETING_CONSENT_CHANGED_EVENT,
        flushSignupConversion,
      );
    };
  }, [initialSignupEventId, metaConfigured]);

  function moveToGoalStep() {
    setResult(null);
    const form = formRef.current;
    if (!form) return;

    if (!businessSegment) {
      setResult({
        ok: false,
        error: "Escolha sua área para continuar.",
        fieldErrors: { business_segment: ["Escolha como você trabalha"] },
      });
      return;
    }

    const nameInput = form.elements.namedItem("name") as HTMLInputElement | null;
    if (!nameInput || nameInput.value.trim().length < 2) {
      setResult({
        ok: false,
        error: "Confira os campos.",
        fieldErrors: {
          name: ["Informe seu nome profissional ou da empresa"],
        },
      });
      return;
    }

    const stateInput = form.elements.namedItem("state") as HTMLInputElement | null;
    if (stateInput?.value && !isBrazilStateCode(stateInput.value)) {
      setResult({
        ok: false,
        error: "Confira os campos.",
        fieldErrors: { state: ["Selecione uma UF válida"] },
      });
      return;
    }

    setStep("goal");
    window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }

  function moveToProfileStep() {
    setResult(null);
    setStep("profile");
    window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    if (step === "profile") {
      moveToGoalStep();
      return;
    }

    if (!activationGoal) {
      setResult({
        ok: false,
        error: "Escolha como você quer começar.",
        fieldErrors: {
          activation_goal: ["Escolha o que você quer resolver primeiro"],
        },
      });
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const url = new URL(window.location.href);
      const { plan } = acquisitionContextFromSearchParams(url.searchParams);
      if (plan) formData.append("plan", plan);
      trackProductEvent("onboarding_submitted", {
        business_segment: businessSegment ?? "not_selected",
        activation_goal: activationGoal,
        target_plan: plan ?? "free",
      });

      try {
        const nextResult = await createCompanyAction(formData);
        if (!nextResult.ok) {
          const firstInvalidField = FIELD_ORDER.find(
            (field) => nextResult.fieldErrors?.[field],
          );
          setStep(
            firstInvalidField === "activation_goal" ? "goal" : "profile",
          );
          trackProductEvent("onboarding_failed", {
            business_segment: businessSegment ?? "not_selected",
            activation_goal: activationGoal,
            target_plan: plan ?? "free",
            has_field_errors: Boolean(nextResult.fieldErrors),
          });
          setResult(nextResult);
          return;
        }

        trackProductEvent("onboarding_completed", {
          business_segment: businessSegment ?? "construction",
          activation_goal: activationGoal,
          target_plan: plan ?? "free",
          redirects_to_checkout: nextResult.redirectTo.includes("/checkout"),
        }, nextResult.eventId ? { eventId: nextResult.eventId } : undefined);
        router.push(nextResult.redirectTo);
        router.refresh();
      } catch {
        trackProductEvent("onboarding_failed", {
          business_segment: businessSegment ?? "not_selected",
          activation_goal: activationGoal,
          target_plan: plan ?? "free",
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
            Etapa {step === "profile" ? "1" : "2"} de 2
          </span>
        </header>

        <div className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-10 lg:pt-10">
          <section className="lg:pt-3">
            <p className="text-sm font-semibold text-primary">
              {step === "profile" ? "Seu espaço de trabalho" : "Seu primeiro resultado"}
            </p>
            <h1
              ref={stepHeadingRef}
              tabIndex={-1}
              className="mt-2 max-w-md text-balance text-2xl font-bold leading-tight outline-none sm:text-3xl"
            >
              {step === "profile"
                ? "Deixe o Prumo com a cara da sua rotina"
                : "Comece pelo que precisa resolver agora"}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              {step === "profile"
                ? "Escolha sua área e informe o essencial. O Prumo adapta a linguagem e os modelos sem mudar seus dados ou seu plano."
                : "Sua escolha organiza o próximo passo. Você poderá mudar de objetivo sem perder nenhum dado."}
            </p>

            <ol className="mt-6 hidden space-y-4 border-l pl-5 lg:block">
              <li>
                <p className="text-sm font-semibold">1. Escolha sua área</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A navegação e os modelos ficam mais familiares.
                </p>
              </li>
              <li>
                <p className="text-sm font-semibold">
                  2. Identifique seu negócio
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nome e contato podem aparecer para o cliente.
                </p>
              </li>
              <li>
                <p className="text-sm font-semibold">
                  3. Alcance a primeira vitória
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  O painel mostra somente o próximo passo relevante.
                </p>
              </li>
            </ol>
          </section>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">
                {step === "profile" ? "Perfil profissional" : "Como quer começar?"}
              </CardTitle>
              <CardDescription>
                {step === "profile"
                  ? "Leva menos de dois minutos."
                  : "Escolha uma opção; o Prumo prepara o caminho."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="space-y-4"
                noValidate
              >
                <div hidden={step !== "profile"} className="space-y-4">
                <BusinessSegmentPicker
                  idPrefix="onboarding-segment"
                  value={businessSegment}
                  onValueChange={(value) => {
                    setBusinessSegment(value);
                    setActivationGoal(undefined);
                    setResult(null);
                  }}
                  description={
                    initialBusinessSegment &&
                    businessSegment === initialBusinessSegment
                      ? "Perfil trazido da demonstração. Confirme ou escolha outra área."
                      : "Isso só adapta textos e sugestões. Você poderá mudar depois."
                  }
                  error={fieldErrors?.business_segment?.[0]}
                  disabled={pending}
                />

                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="name">
                    Nome profissional ou da empresa *
                  </Label>
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
                      maxLength={200}
                      autoComplete="organization"
                      placeholder="Ex.: Estúdio Norte…"
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
                      maxLength={30}
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
                        maxLength={120}
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

                </div>

                {businessSegment ? (
                  <div hidden={step !== "goal"}>
                    <ActivationGoalPicker
                      idPrefix="onboarding-goal"
                      segment={businessSegment}
                      value={activationGoal}
                      onValueChange={(value) => {
                        setActivationGoal(value);
                        setResult(null);
                        trackProductEvent("onboarding_goal_selected", {
                          business_segment: businessSegment,
                          activation_goal: value,
                        });
                      }}
                      error={fieldErrors?.activation_goal?.[0]}
                      disabled={pending}
                    />
                  </div>
                ) : null}

                {result && !result.ok ? (
                  <p
                    className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                    role="alert"
                    aria-live="polite"
                  >
                    {result.error}
                  </p>
                ) : null}

                {step === "profile" ? (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={moveToGoalStep}
                    disabled={pending}
                  >
                    Continuar
                    <ArrowRight aria-hidden="true" />
                  </Button>
                ) : (
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={moveToProfileStep}
                      disabled={pending}
                    >
                      <ArrowLeft aria-hidden="true" />
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="sm:min-w-48"
                      disabled={pending}
                    >
                      {pending ? "Preparando painel…" : "Começar agora"}
                      {!pending ? <ArrowRight aria-hidden="true" /> : null}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
