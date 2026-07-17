"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { FormSaveBar } from "@/components/forms/form-save-bar";
import type { FormSaveStatus } from "@/components/forms/form-save-status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatSavedTime } from "@/lib/form-draft";
import type { CompanyFull } from "@/lib/queries/company-settings";
import type { PixKeyType } from "@/lib/supabase/types";
import { updatePaymentSettingsAction } from "./actions";
import {
  initialPaymentSettingsDraft,
  paymentSettingsDraftSignature,
  paymentSettingsPayload,
  validatePaymentSettingsDraft,
  type PaymentSettingsDraft,
  type PaymentSettingsDraftField,
} from "./payment-settings-draft";

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "random", label: "Chave aleatória" },
] as const;

interface PaymentSettingsFormProps {
  company: CompanyFull;
  onDirtyChange: (dirty: boolean) => void;
}

export function PaymentSettingsForm({
  company,
  onDirtyChange,
}: PaymentSettingsFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<PaymentSettingsDraft>(() =>
    initialPaymentSettingsDraft(company),
  );
  const [savedSignature, setSavedSignature] = useState(() =>
    paymentSettingsDraftSignature(initialPaymentSettingsDraft(company)),
  );
  const [pending, startTransition] = useTransition();
  const [operationState, setOperationState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<PaymentSettingsDraftField, string>>
  >({});
  const [focusTarget, setFocusTarget] =
    useState<PaymentSettingsDraftField | null>(null);

  const currentSignature = useMemo(
    () => paymentSettingsDraftSignature(draft),
    [draft],
  );
  const validation = useMemo(
    () => validatePaymentSettingsDraft(draft),
    [draft],
  );
  const isDirty = currentSignature !== savedSignature;
  const saving = pending || operationState === "saving";
  const manualPix = draft.payment_provider === "manual_pix";
  const manualPixReady = manualPix && validation.valid;
  const status: FormSaveStatus = saving
    ? "saving"
    : operationState === "error"
      ? "error"
      : isDirty
        ? "dirty"
        : "saved";
  const visibleErrors: Partial<Record<PaymentSettingsDraftField, string>> = {
    ...(showValidationErrors ? validation.errors : {}),
    ...serverFieldErrors,
  };

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange(false);
  }, [onDirtyChange]);

  useEffect(() => {
    if (!focusTarget) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(focusTarget);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", inline: "nearest" });
      setFocusTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusTarget]);

  function updateField<K extends PaymentSettingsDraftField>(
    field: K,
    value: PaymentSettingsDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setServerFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
    setOperationState((current) => (current === "error" ? "idle" : current));
  }

  function submit() {
    setError(null);
    setServerFieldErrors({});

    if (!validation.valid) {
      setShowValidationErrors(true);
      setFocusTarget(validation.firstField);
      return;
    }
    if (!isDirty) return;

    setOperationState("saving");
    startTransition(async () => {
      try {
        const result = await updatePaymentSettingsAction(
          paymentSettingsPayload(draft),
        );
        if (!result.ok) {
          const mapped = mapServerFieldErrors(result.fieldErrors);
          setServerFieldErrors(mapped);
          setError(Object.keys(mapped).length > 0 ? null : result.error);
          setOperationState("error");
          const firstServerField = PAYMENT_FIELDS.find(
            (field) => mapped[field],
          );
          if (firstServerField) setFocusTarget(firstServerField);
          return;
        }

        setSavedSignature(currentSignature);
        setLastSavedAt(new Date());
        setShowValidationErrors(false);
        setOperationState("idle");
        router.refresh();
      } catch {
        setError("Não foi possível salvar agora. Verifique sua conexão e tente novamente.");
        setOperationState("error");
      }
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="rounded-lg border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-md bg-primary/10 p-2 text-primary">
          <WalletCards aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Recebimento das obras</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Escolha como entrada e saldo serão cobrados. No Pix direto, o
            cliente paga na chave da empresa e você confirma depois de conferir
            o extrato.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ProviderOption
          checked={manualPix}
          icon={WalletCards}
          title="Pix direto na sua chave"
          badge="Recomendado"
          description="Gera QR Code e copia-e-cola sem API. O dinheiro cai na conta vinculada à chave configurada."
          onClick={() => updateField("payment_provider", "manual_pix")}
        />
        <ProviderOption
          checked={draft.payment_provider === "asaas"}
          icon={Landmark}
          title="Asaas automático"
          badge="Avançado"
          description="Usa API e webhook para baixa automática. Não é obrigatório para vender o primeiro projeto."
          onClick={() => updateField("payment_provider", "asaas")}
        />
      </div>

      {manualPix ? (
        <div className="mt-4 space-y-4 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            />
            O Prumo não segura dinheiro da obra. Ele monta o QR Code, organiza a
            cobrança e deixa claro quando marcar a parcela como recebida.
          </div>

          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="pix_key_type">Tipo de chave</Label>
              <select
                id="pix_key_type"
                name="pix_key_type"
                value={draft.pix_key_type}
                onChange={(event) =>
                  updateField("pix_key_type", event.target.value as PixKeyType)
                }
                disabled={saving}
                autoComplete="off"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
              >
                {PIX_KEY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <PaymentField
              id="pix_key"
              label="Chave Pix que receberá os pagamentos"
              error={visibleErrors.pix_key}
            >
              <Input
                id="pix_key"
                name="pix_key"
                value={draft.pix_key}
                onChange={(event) => updateField("pix_key", event.target.value)}
                placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória"
                maxLength={120}
                autoComplete="off"
                disabled={saving}
                aria-invalid={Boolean(visibleErrors.pix_key) || undefined}
                aria-describedby={
                  visibleErrors.pix_key ? "pix_key-error" : undefined
                }
                className={
                  visibleErrors.pix_key ? "border-destructive" : undefined
                }
              />
            </PaymentField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PaymentField
              id="pix_receiver_name"
              label="Nome que aparece no banco"
              error={visibleErrors.pix_receiver_name}
              help="Use o nome que o cliente reconhecerá no app do banco."
            >
              <Input
                id="pix_receiver_name"
                name="pix_receiver_name"
                value={draft.pix_receiver_name}
                onChange={(event) =>
                  updateField("pix_receiver_name", event.target.value)
                }
                placeholder="Ex.: Coberturas do Léo"
                maxLength={80}
                autoComplete="organization"
                disabled={saving}
                aria-invalid={
                  Boolean(visibleErrors.pix_receiver_name) || undefined
                }
                aria-describedby={
                  visibleErrors.pix_receiver_name
                    ? "pix_receiver_name-error"
                    : "pix_receiver_name-help"
                }
                className={
                  visibleErrors.pix_receiver_name
                    ? "border-destructive"
                    : undefined
                }
              />
            </PaymentField>

            <PaymentField
              id="pix_receiver_city"
              label="Cidade do recebedor"
              error={visibleErrors.pix_receiver_city}
              help="A cidade também aparece no Pix do banco."
            >
              <Input
                id="pix_receiver_city"
                name="pix_receiver_city"
                value={draft.pix_receiver_city}
                onChange={(event) =>
                  updateField("pix_receiver_city", event.target.value)
                }
                placeholder="Ex.: Timon"
                maxLength={80}
                autoComplete="address-level2"
                disabled={saving}
                aria-invalid={
                  Boolean(visibleErrors.pix_receiver_city) || undefined
                }
                aria-describedby={
                  visibleErrors.pix_receiver_city
                    ? "pix_receiver_city-error"
                    : "pix_receiver_city-help"
                }
                className={
                  visibleErrors.pix_receiver_city
                    ? "border-destructive"
                    : undefined
                }
              />
            </PaymentField>
          </div>

          <PaymentField
            id="pix_instructions"
            label="Mensagem que aparece para o cliente"
            error={visibleErrors.pix_instructions}
          >
            <Textarea
              id="pix_instructions"
              name="pix_instructions"
              value={draft.pix_instructions}
              onChange={(event) =>
                updateField("pix_instructions", event.target.value)
              }
              placeholder="Ex.: Depois de pagar, envie o comprovante no WhatsApp."
              maxLength={500}
              autoComplete="off"
              disabled={saving}
              aria-invalid={
                Boolean(visibleErrors.pix_instructions) || undefined
              }
              aria-describedby={
                visibleErrors.pix_instructions
                  ? "pix_instructions-error"
                  : undefined
              }
              className={
                visibleErrors.pix_instructions
                  ? "border-destructive"
                  : undefined
              }
            />
          </PaymentField>

          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm leading-6",
              manualPixReady && !isDirty
                ? "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100"
                : manualPixReady
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-border bg-background text-muted-foreground",
            )}
          >
            <div className="font-medium">
              {manualPixReady && !isDirty
                ? "Pix direto ativo para novas cobranças."
                : manualPixReady
                  ? "Dados preenchidos. Salve para ativar o Pix direto."
                  : "Complete chave, nome e cidade para liberar o QR Code Pix."}
            </div>
            <div className="text-xs opacity-80">
              A obra só gera QR Code quando essa configuração estiver salva.
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
          Este modo exige conta Asaas em produção, chave de API e webhook ativo.
          Para começar sem automação de baixa, o Pix direto costuma ser mais
          simples.
        </div>
      )}

      {error && (
        <div
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="status"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <div aria-hidden="true" className="h-4" />
      <FormSaveBar
        status={status}
        lastSavedLabel={formatSavedTime(lastSavedAt)}
        onSave={submit}
        saveDisabled={saving || !isDirty}
        saveLabel="Salvar recebimento"
        savedLabel="Forma de recebimento salva"
        savedHint="Novas cobranças usarão esta configuração."
        dirtyHint="Salve antes de gerar uma nova cobrança de obra."
      />
    </form>
  );
}

function ProviderOption({
  checked,
  icon: Icon,
  title,
  badge,
  description,
  onClick,
}: {
  checked: boolean;
  icon: typeof WalletCards;
  title: string;
  badge: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={cn(
        "min-h-11 rounded-lg border p-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-4",
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "bg-background",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
            checked
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {badge}
        </span>
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </button>
  );
}

function PaymentField({
  id,
  label,
  error,
  help,
  children,
}: {
  id: PaymentSettingsDraftField;
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

const PAYMENT_FIELDS: PaymentSettingsDraftField[] = [
  "payment_provider",
  "pix_key_type",
  "pix_key",
  "pix_receiver_name",
  "pix_receiver_city",
  "pix_instructions",
];

function mapServerFieldErrors(
  fieldErrors?: Record<string, string[]>,
): Partial<Record<PaymentSettingsDraftField, string>> {
  if (!fieldErrors) return {};
  const mapped: Partial<Record<PaymentSettingsDraftField, string>> = {};
  for (const field of PAYMENT_FIELDS) {
    const message = fieldErrors[field]?.[0];
    if (message) mapped[field] = message;
  }
  return mapped;
}
