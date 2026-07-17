"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormSaveBar } from "@/components/forms/form-save-bar";
import type { FormSaveStatus } from "@/components/forms/form-save-status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSavedTime } from "@/lib/form-draft";
import type { CompanyFull } from "@/lib/queries/company-settings";
import { updateCompanyAction } from "./actions";
import {
  companyDraftSignature,
  initialCompanyDraft,
  normalizedCompanyDraft,
  validateCompanyDraft,
  type CompanyDraft,
  type CompanyDraftField,
} from "./company-draft";

interface CompanyFormProps {
  company: CompanyFull;
  onDirtyChange: (dirty: boolean) => void;
}

export function CompanyForm({ company, onDirtyChange }: CompanyFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<CompanyDraft>(() =>
    initialCompanyDraft(company),
  );
  const [savedSignature, setSavedSignature] = useState(() =>
    companyDraftSignature(initialCompanyDraft(company)),
  );
  const [operationState, setOperationState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<CompanyDraftField, string>>
  >({});
  const [focusTarget, setFocusTarget] = useState<CompanyDraftField | null>(null);

  const currentSignature = useMemo(
    () => companyDraftSignature(draft),
    [draft],
  );
  const validation = useMemo(() => validateCompanyDraft(draft), [draft]);
  const isDirty = currentSignature !== savedSignature;
  const saving = pending || operationState === "saving";
  const status: FormSaveStatus = saving
    ? "saving"
    : operationState === "error"
      ? "error"
      : isDirty
        ? "dirty"
        : "saved";
  const visibleErrors: Partial<Record<CompanyDraftField, string>> = {
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

  function updateField(field: CompanyDraftField, value: string) {
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
        const result = await updateCompanyAction(normalizedCompanyDraft(draft));
        if (!result.ok) {
          const mapped = mapServerFieldErrors(result.fieldErrors);
          setServerFieldErrors(mapped);
          setError(Object.keys(mapped).length > 0 ? null : result.error);
          setOperationState("error");
          const firstServerField = COMPANY_FIELDS.find(
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
      className="space-y-5 rounded-lg border bg-card p-4 sm:p-5"
    >
      <fieldset className="space-y-4 border-b pb-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Identificação
        </legend>

        <CompanyField
          id="name"
          label="Nome da empresa"
          required
          error={visibleErrors.name}
        >
          <Input
            id="name"
            name="name"
            value={draft.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Coberturas do Léo"
            maxLength={200}
            autoComplete="organization"
            aria-invalid={Boolean(visibleErrors.name) || undefined}
            aria-describedby={visibleErrors.name ? "name-error" : undefined}
            className={visibleErrors.name ? "border-destructive" : undefined}
          />
        </CompanyField>

        <div className="grid gap-4 md:grid-cols-2">
          <CompanyField
            id="legal_name"
            label="Razão social"
            error={visibleErrors.legal_name}
          >
            <Input
              id="legal_name"
              name="legal_name"
              value={draft.legal_name}
              onChange={(event) =>
                updateField("legal_name", event.target.value)
              }
              placeholder="Coberturas do Léo LTDA"
              maxLength={200}
              autoComplete="organization"
              aria-invalid={Boolean(visibleErrors.legal_name) || undefined}
              aria-describedby={
                visibleErrors.legal_name ? "legal_name-error" : undefined
              }
              className={
                visibleErrors.legal_name ? "border-destructive" : undefined
              }
            />
          </CompanyField>

          <CompanyField id="cnpj" label="CNPJ" error={visibleErrors.cnpj}>
            <Input
              id="cnpj"
              name="cnpj"
              inputMode="numeric"
              value={draft.cnpj}
              onChange={(event) => updateField("cnpj", event.target.value)}
              placeholder="00.000.000/0001-00"
              maxLength={18}
              autoComplete="off"
              aria-invalid={Boolean(visibleErrors.cnpj) || undefined}
              aria-describedby={visibleErrors.cnpj ? "cnpj-error" : undefined}
              className={visibleErrors.cnpj ? "border-destructive" : undefined}
            />
          </CompanyField>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-b pb-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Contato
        </legend>

        <div className="grid gap-4 md:grid-cols-2">
          <CompanyField
            id="phone"
            label="Telefone / WhatsApp"
            error={visibleErrors.phone}
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={draft.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="Digite seu WhatsApp comercial"
              maxLength={30}
              autoComplete="tel"
              aria-invalid={Boolean(visibleErrors.phone) || undefined}
              aria-describedby={
                visibleErrors.phone ? "phone-error" : undefined
              }
              className={
                visibleErrors.phone ? "border-destructive" : undefined
              }
            />
          </CompanyField>

          <CompanyField
            id="email"
            label="Email"
            error={visibleErrors.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              value={draft.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="contato@empresa.com.br"
              maxLength={254}
              autoComplete="email"
              aria-invalid={Boolean(visibleErrors.email) || undefined}
              aria-describedby={
                visibleErrors.email ? "email-error" : undefined
              }
              className={
                visibleErrors.email ? "border-destructive" : undefined
              }
            />
          </CompanyField>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-b pb-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Endereço
        </legend>

        <CompanyField
          id="address"
          label="Rua, número e bairro"
          error={visibleErrors.address}
        >
          <Input
            id="address"
            name="address"
            value={draft.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Av. Frei Serafim, 123 — Centro"
            maxLength={300}
            autoComplete="street-address"
            aria-invalid={Boolean(visibleErrors.address) || undefined}
            aria-describedby={
              visibleErrors.address ? "address-error" : undefined
            }
            className={
              visibleErrors.address ? "border-destructive" : undefined
            }
          />
        </CompanyField>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_140px]">
          <CompanyField
            id="city"
            label="Cidade"
            error={visibleErrors.city}
          >
            <Input
              id="city"
              name="city"
              value={draft.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="Teresina"
              maxLength={120}
              autoComplete="address-level2"
              aria-invalid={Boolean(visibleErrors.city) || undefined}
              aria-describedby={visibleErrors.city ? "city-error" : undefined}
              className={
                visibleErrors.city ? "border-destructive" : undefined
              }
            />
          </CompanyField>

          <CompanyField
            id="state"
            label="UF"
            error={visibleErrors.state}
          >
            <Input
              id="state"
              name="state"
              value={draft.state}
              onChange={(event) => updateField("state", event.target.value)}
              placeholder="PI"
              maxLength={2}
              autoComplete="address-level1"
              aria-invalid={Boolean(visibleErrors.state) || undefined}
              aria-describedby={
                visibleErrors.state ? "state-error" : undefined
              }
              className={`uppercase ${
                visibleErrors.state ? "border-destructive" : ""
              }`}
            />
          </CompanyField>

          <CompanyField
            id="zip_code"
            label="CEP"
            error={visibleErrors.zip_code}
          >
            <Input
              id="zip_code"
              name="zip_code"
              inputMode="numeric"
              value={draft.zip_code}
              onChange={(event) => updateField("zip_code", event.target.value)}
              placeholder="64000-000"
              maxLength={10}
              autoComplete="postal-code"
              aria-invalid={Boolean(visibleErrors.zip_code) || undefined}
              aria-describedby={
                visibleErrors.zip_code ? "zip_code-error" : undefined
              }
              className={
                visibleErrors.zip_code ? "border-destructive" : undefined
              }
            />
          </CompanyField>
        </div>
      </fieldset>

      {error && (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="status"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <FormSaveBar
        status={status}
        lastSavedLabel={formatSavedTime(lastSavedAt)}
        onSave={submit}
        saveDisabled={saving || !isDirty}
        savedLabel="Dados da empresa salvos"
        savedHint="Estas informações aparecem nos documentos e telas do cliente."
        dirtyHint="Salve para atualizar a identificação da empresa."
      />
    </form>
  );
}

function CompanyField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: CompanyDraftField;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const COMPANY_FIELDS: CompanyDraftField[] = [
  "name",
  "legal_name",
  "cnpj",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zip_code",
];

function mapServerFieldErrors(
  fieldErrors?: Record<string, string[]>,
): Partial<Record<CompanyDraftField, string>> {
  if (!fieldErrors) return {};
  const mapped: Partial<Record<CompanyDraftField, string>> = {};
  for (const field of COMPANY_FIELDS) {
    const message = fieldErrors[field]?.[0];
    if (message) mapped[field] = message;
  }
  return mapped;
}
