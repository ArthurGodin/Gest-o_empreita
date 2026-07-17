"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormSaveBar } from "@/components/forms/form-save-bar";
import type { FormSaveStatus } from "@/components/forms/form-save-status";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatSavedTime } from "@/lib/form-draft";
import type { Customer } from "@/lib/queries/customers";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionResult,
} from "./actions";
import {
  customerDraftFormData,
  customerDraftSignature,
  initialCustomerDraft,
  validateCustomerDraft,
  type CustomerDraft,
  type CustomerDraftField,
} from "./customer-draft";

interface CustomerFormProps {
  customer?: Customer;
  cancelHref?: string;
  afterCreate?: "customer" | "quote";
}

export function CustomerForm({
  customer,
  cancelHref = "/app/clientes",
  afterCreate = "customer",
}: CustomerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<CustomerDraft>(() =>
    initialCustomerDraft(customer),
  );
  const [savedSignature, setSavedSignature] = useState(() =>
    customerDraftSignature(initialCustomerDraft(customer)),
  );
  const [operationState, setOperationState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Partial<Record<CustomerDraftField, string>>
  >({});
  const [focusTarget, setFocusTarget] = useState<CustomerDraftField | null>(
    null,
  );

  const isEdit = Boolean(customer);
  const currentSignature = useMemo(
    () => customerDraftSignature(draft),
    [draft],
  );
  const validation = useMemo(() => validateCustomerDraft(draft), [draft]);
  const isDirty = currentSignature !== savedSignature;
  const saving = pending || operationState === "saving";
  const saveStatus: FormSaveStatus = saving
    ? "saving"
    : operationState === "error"
      ? "error"
      : isDirty
        ? "dirty"
        : "saved";
  const visibleErrors: Partial<Record<CustomerDraftField, string>> = {
    ...(showValidationErrors ? validation.errors : {}),
    ...serverFieldErrors,
  };

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

  function updateField(field: CustomerDraftField, value: string) {
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
        const result: CustomerActionResult = isEdit
          ? await updateCustomerAction(
              customer!.id,
              customerDraftFormData(draft),
            )
          : await createCustomerAction(customerDraftFormData(draft));

        if (!result.ok) {
          const mapped = mapServerFieldErrors(result.fieldErrors);
          setServerFieldErrors(mapped);
          setError(Object.keys(mapped).length > 0 ? null : result.error);
          setOperationState("error");
          const firstServerField = CUSTOMER_FIELDS.find(
            (field) => mapped[field],
          );
          if (firstServerField) setFocusTarget(firstServerField);
          return;
        }

        setSavedSignature(currentSignature);
        setLastSavedAt(new Date());
        setShowValidationErrors(false);
        setOperationState("idle");

        if (!isEdit) {
          router.push(
            afterCreate === "quote"
              ? `/app/orcamentos/novo?cliente=${result.id}`
              : `/app/clientes/${result.id}`,
          );
        } else {
          router.refresh();
        }
      } catch {
        setError(
          "Não foi possível salvar agora. Verifique sua conexão e tente novamente.",
        );
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
      <ProtectedFormNavigation
        dirty={isDirty}
        contentLabel={isEdit ? "neste cliente" : "neste novo cliente"}
      />

      <fieldset className="space-y-4 border-b pb-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Dados do cliente
        </legend>

        <CustomerField
          id="name"
          label="Nome"
          required
          error={visibleErrors.name}
        >
          <Input
            id="name"
            name="name"
            value={draft.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="João da Silva ou Construtora Silva LTDA"
            maxLength={200}
            autoComplete="name"
            aria-invalid={Boolean(visibleErrors.name) || undefined}
            aria-describedby={visibleErrors.name ? "name-error" : undefined}
            className={visibleErrors.name ? "border-destructive" : undefined}
          />
        </CustomerField>

        <div className="grid gap-4 md:grid-cols-2">
          <CustomerField
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
              placeholder="Digite o WhatsApp do cliente"
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
          </CustomerField>

          <CustomerField
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
              placeholder="cliente@exemplo.com"
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
          </CustomerField>
        </div>

        <CustomerField
          id="document"
          label="CPF / CNPJ"
          error={visibleErrors.document}
        >
          <Input
            id="document"
            name="document"
            inputMode="numeric"
            value={draft.document}
            onChange={(event) => updateField("document", event.target.value)}
            placeholder="CPF ou CNPJ do cliente"
            maxLength={18}
            autoComplete="off"
            aria-invalid={Boolean(visibleErrors.document) || undefined}
            aria-describedby={
              visibleErrors.document ? "document-error" : undefined
            }
            className={
              visibleErrors.document ? "border-destructive" : undefined
            }
          />
        </CustomerField>
      </fieldset>

      <fieldset className="space-y-4 border-b pb-5">
        <legend className="mb-3 text-sm font-semibold text-foreground">
          Endereço (opcional)
        </legend>

        <CustomerField
          id="address"
          label="Rua, número e bairro"
          error={visibleErrors.address}
        >
          <Input
            id="address"
            name="address"
            value={draft.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Rua das Flores, 123 — Centro"
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
        </CustomerField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_140px]">
          <CustomerField
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
          </CustomerField>

          <CustomerField
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
          </CustomerField>

          <CustomerField
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
          </CustomerField>
        </div>
      </fieldset>

      <CustomerField
        id="notes"
        label="Observações"
        error={visibleErrors.notes}
      >
        <Textarea
          id="notes"
          name="notes"
          value={draft.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Anotações internas sobre o cliente, preferências, histórico…"
          rows={3}
          maxLength={2_000}
          autoComplete="off"
          aria-invalid={Boolean(visibleErrors.notes) || undefined}
          aria-describedby={visibleErrors.notes ? "notes-error" : undefined}
          className={visibleErrors.notes ? "border-destructive" : undefined}
        />
      </CustomerField>

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
        status={saveStatus}
        lastSavedLabel={formatSavedTime(lastSavedAt)}
        onSave={submit}
        saveDisabled={saving || !isDirty}
        saveLabel={
          isEdit
            ? "Salvar alterações"
            : afterCreate === "quote"
              ? "Cadastrar e criar orçamento"
              : "Cadastrar cliente"
        }
        savingLabel={isEdit ? "Salvando…" : "Cadastrando…"}
        savedLabel={isEdit ? "Dados do cliente salvos" : "Cadastro ainda vazio"}
        savedHint={
          isEdit
            ? "As informações deste cliente estão atualizadas."
            : "Preencha pelo menos o nome para cadastrar."
        }
        dirtyHint={
          isEdit
            ? "Salve para atualizar os dados do cliente."
            : "Cadastre para não perder os dados preenchidos."
        }
        secondaryAction={
          <Button asChild variant="outline">
            <Link
              href={cancelHref}
              aria-disabled={saving}
              className={saving ? "pointer-events-none" : undefined}
              tabIndex={saving ? -1 : undefined}
            >
              Cancelar
            </Link>
          </Button>
        }
      />
    </form>
  );
}

function CustomerField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: CustomerDraftField;
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

const CUSTOMER_FIELDS: CustomerDraftField[] = [
  "name",
  "phone",
  "email",
  "document",
  "address",
  "city",
  "state",
  "zip_code",
  "notes",
];

function mapServerFieldErrors(
  fieldErrors?: Record<string, string[]>,
): Partial<Record<CustomerDraftField, string>> {
  if (!fieldErrors) return {};
  const mapped: Partial<Record<CustomerDraftField, string>> = {};
  for (const field of CUSTOMER_FIELDS) {
    const message = fieldErrors[field]?.[0];
    if (message) mapped[field] = message;
  }
  return mapped;
}
