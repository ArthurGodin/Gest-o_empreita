"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FolderKanban,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getActivationGoalOption, type ActivationGoal } from "@/lib/activation-goals";
import {
  getBusinessVocabulary,
  type BusinessSegment,
} from "@/lib/business-segment";
import { trackProductEvent } from "@/lib/product-analytics";
import type { Customer } from "@/lib/queries/customers";
import type { StageTemplate } from "@/lib/queries/stage-templates";
import { cn } from "@/lib/utils";
import {
  createDirectProjectAction,
  type DirectProjectActionInput,
} from "./actions";
import {
  initialDirectProjectDraft,
  isDirectProjectDraftDirty,
  validateDirectProjectDraft,
  type DirectProjectDraft,
  type DirectProjectDraftField,
} from "./direct-project-draft";

interface DirectProjectFormProps {
  customers: Customer[];
  templates: StageTemplate[];
  goal: ActivationGoal;
  segment: BusinessSegment;
}

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base shadow-[0_1px_1px_rgba(15,23,42,0.02)] outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 md:text-sm";

const SERVER_FIELD_TO_DRAFT: Record<string, DirectProjectDraftField> = {
  existing_customer_id: "existingCustomerId",
  customer_name: "customerName",
  customer_document: "customerDocument",
  customer_phone: "customerPhone",
  customer_email: "customerEmail",
  customer_address: "customerAddress",
  customer_city: "customerCity",
  customer_state: "customerState",
  customer_zip_code: "customerZipCode",
  project_name: "projectName",
  project_description: "projectDescription",
  project_address: "projectAddress",
  project_status: "projectStatus",
  starts_on: "startsOn",
  ends_on: "endsOn",
  budget_cents: "budget",
  template_id: "templateId",
};

const GOAL_ICONS = {
  existing_project: FolderKanban,
  client_briefing: ClipboardList,
  deliverables: FileCheck2,
  execution_control: CircleDollarSign,
  sell: BriefcaseBusiness,
} as const;

export function DirectProjectForm({
  customers,
  templates,
  goal,
  segment,
}: DirectProjectFormProps) {
  const router = useRouter();
  const vocabulary = getBusinessVocabulary(segment);
  const goalOption = getActivationGoalOption(goal, segment);
  const GoalIcon = GOAL_ICONS[goal];
  const [draft, setDraft] = useState(() =>
    initialDirectProjectDraft(goal, customers),
  );
  const [creationKey] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<DirectProjectDraftField, string>>
  >({});
  const dirty = !completed && isDirectProjectDraftDirty(draft);
  const projectLabel = vocabulary.projectSingular.toLowerCase();

  const customTemplates = useMemo(
    () => templates.filter((template) => !template.is_system),
    [templates],
  );
  const systemTemplates = useMemo(
    () => templates.filter((template) => template.is_system),
    [templates],
  );

  function update<K extends keyof DirectProjectDraft>(
    field: K,
    value: DirectProjectDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  }

  function focusField(field: DirectProjectDraftField | null) {
    if (!field) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`direct-${field}`)?.focus();
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const validation = validateDirectProjectDraft(draft);
    setFieldErrors(validation.errors);

    if (!validation.valid) {
      focusField(validation.firstField);
      return;
    }

    const input: DirectProjectActionInput = {
      creation_key: creationKey,
      goal: draft.goal,
      customer_mode: draft.customerMode,
      existing_customer_id:
        draft.customerMode === "existing" ? draft.existingCustomerId : null,
      customer_name: draft.customerName.trim(),
      customer_document: draft.customerDocument.trim(),
      customer_phone: draft.customerPhone.trim(),
      customer_email: draft.customerEmail.trim(),
      customer_address: draft.customerAddress.trim(),
      customer_city: draft.customerCity.trim(),
      customer_state: draft.customerState.trim(),
      customer_zip_code: draft.customerZipCode.trim(),
      project_name: draft.projectName.trim(),
      project_description: draft.projectDescription.trim(),
      project_address: draft.projectAddress.trim(),
      project_status: draft.projectStatus,
      starts_on: draft.startsOn || null,
      ends_on: draft.endsOn || null,
      budget_cents: validation.budgetCents,
      template_id: draft.templateId || null,
    };

    trackProductEvent("direct_project_started", {
      business_segment: segment,
      activation_goal: goal,
      customer_mode: draft.customerMode,
      has_template: Boolean(draft.templateId),
    });

    startTransition(async () => {
      try {
        const result = await createDirectProjectAction(input);
        if (!result.ok) {
          const mappedErrors = mapServerFieldErrors(result.fieldErrors);
          setFieldErrors(mappedErrors);
          setError(result.error);
          focusField(firstMappedField(mappedErrors));
          trackProductEvent("direct_project_failed", {
            business_segment: segment,
            activation_goal: goal,
            has_field_errors: Boolean(result.fieldErrors),
          });
          return;
        }

        setCompleted(true);
        trackProductEvent("direct_project_created", {
          business_segment: segment,
          activation_goal: goal,
          customer_mode: draft.customerMode,
          has_template: Boolean(draft.templateId),
        });
        router.push(result.redirectTo);
        router.refresh();
      } catch {
        setError("Não foi possível cadastrar agora. Tente novamente.");
        trackProductEvent("direct_project_failed", {
          business_segment: segment,
          activation_goal: goal,
          thrown: true,
        });
      }
    });
  }

  return (
    <>
      <ProtectedFormNavigation
        dirty={dirty}
        contentLabel={`neste cadastro de ${projectLabel}`}
      />

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/[0.045] p-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GoalIcon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {goalOption.title}
          </p>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
            {directGoalHint(goal, vocabulary.projectSingular)}
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="overflow-hidden rounded-lg border bg-card"
        noValidate
      >
        <FormSection
          number="1"
          title="Cliente"
          description="Escolha alguém já cadastrado ou informe só o essencial agora."
        >
          <fieldset className="space-y-3">
            <legend className="sr-only">Origem do cliente</legend>
            <div className="grid grid-cols-2 rounded-md border bg-muted/35 p-1">
              <ModeOption
                id="direct-customer-existing"
                name="customer-mode"
                label="Já cadastrado"
                checked={draft.customerMode === "existing"}
                disabled={customers.length === 0 || pending}
                onChange={() => update("customerMode", "existing")}
              />
              <ModeOption
                id="direct-customer-new"
                name="customer-mode"
                label="Novo cliente"
                checked={draft.customerMode === "new"}
                disabled={pending}
                onChange={() => update("customerMode", "new")}
              />
            </div>
          </fieldset>

          {draft.customerMode === "existing" ? (
            <Field
              label="Cliente"
              htmlFor="direct-existingCustomerId"
              error={fieldErrors.existingCustomerId}
              required
            >
              <select
                id="direct-existingCustomerId"
                name="existing_customer_id"
                value={draft.existingCustomerId}
                onChange={(event) =>
                  update("existingCustomerId", event.target.value)
                }
                className={cn(
                  SELECT_CLASS,
                  fieldErrors.existingCustomerId && "border-destructive",
                )}
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.existingCustomerId) || undefined}
              >
                <option value="">Selecione um cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.city ? ` - ${customer.city}` : ""}
                    {customer.state ? `/${customer.state}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="space-y-4">
              <Field
                label="Nome do cliente"
                htmlFor="direct-customerName"
                error={fieldErrors.customerName}
                required
              >
                <Input
                  id="direct-customerName"
                  name="customer_name"
                  value={draft.customerName}
                  onChange={(event) => update("customerName", event.target.value)}
                  placeholder="Ex.: Maria Santos…"
                  maxLength={200}
                  autoComplete="name"
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.customerName) || undefined}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="WhatsApp"
                  htmlFor="direct-customerPhone"
                  error={fieldErrors.customerPhone}
                >
                  <Input
                    id="direct-customerPhone"
                    name="customer_phone"
                    type="tel"
                    inputMode="tel"
                    value={draft.customerPhone}
                    onChange={(event) =>
                      update("customerPhone", event.target.value)
                    }
                    placeholder="(11) 99999-1234…"
                    maxLength={30}
                    autoComplete="tel"
                    disabled={pending}
                  />
                </Field>
                <Field
                  label="Email"
                  htmlFor="direct-customerEmail"
                  error={fieldErrors.customerEmail}
                >
                  <Input
                    id="direct-customerEmail"
                    name="customer_email"
                    type="email"
                    inputMode="email"
                    value={draft.customerEmail}
                    onChange={(event) =>
                      update("customerEmail", event.target.value)
                    }
                    placeholder="cliente@email.com…"
                    maxLength={254}
                    autoComplete="email"
                    spellCheck={false}
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.customerEmail) || undefined}
                  />
                </Field>
              </div>

              <details className="group rounded-md border bg-muted/20">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  Dados adicionais do cliente
                  <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                    Opcional
                  </span>
                </summary>
                <div className="space-y-4 border-t p-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="CPF ou CNPJ"
                      htmlFor="direct-customerDocument"
                      error={fieldErrors.customerDocument}
                    >
                      <Input
                        id="direct-customerDocument"
                        name="customer_document"
                        inputMode="numeric"
                        autoComplete="off"
                        value={draft.customerDocument}
                        onChange={(event) =>
                          update("customerDocument", event.target.value)
                        }
                        maxLength={18}
                        disabled={pending}
                        aria-invalid={Boolean(fieldErrors.customerDocument) || undefined}
                      />
                    </Field>
                    <Field
                      label="CEP"
                      htmlFor="direct-customerZipCode"
                      error={fieldErrors.customerZipCode}
                    >
                      <Input
                        id="direct-customerZipCode"
                        name="customer_zip_code"
                        inputMode="numeric"
                        value={draft.customerZipCode}
                        onChange={(event) =>
                          update("customerZipCode", event.target.value)
                        }
                        maxLength={10}
                        autoComplete="postal-code"
                        disabled={pending}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Endereço"
                    htmlFor="direct-customerAddress"
                    error={fieldErrors.customerAddress}
                  >
                    <Input
                      id="direct-customerAddress"
                      name="customer_address"
                      value={draft.customerAddress}
                      onChange={(event) =>
                        update("customerAddress", event.target.value)
                      }
                      maxLength={300}
                      autoComplete="street-address"
                      disabled={pending}
                    />
                  </Field>
                  <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
                    <Field
                      label="Cidade"
                      htmlFor="direct-customerCity"
                      error={fieldErrors.customerCity}
                    >
                      <Input
                        id="direct-customerCity"
                        name="customer_city"
                        value={draft.customerCity}
                        onChange={(event) =>
                          update("customerCity", event.target.value)
                        }
                        maxLength={120}
                        autoComplete="address-level2"
                        disabled={pending}
                      />
                    </Field>
                    <Field
                      label="UF"
                      htmlFor="direct-customerState"
                      error={fieldErrors.customerState}
                    >
                      <Input
                        id="direct-customerState"
                        name="customer_state"
                        value={draft.customerState}
                        onChange={(event) =>
                          update("customerState", event.target.value.toUpperCase())
                        }
                        maxLength={2}
                        autoComplete="address-level1"
                        disabled={pending}
                        aria-invalid={Boolean(fieldErrors.customerState) || undefined}
                      />
                    </Field>
                  </div>
                </div>
              </details>
            </div>
          )}
        </FormSection>

        <FormSection
          number="2"
          title={vocabulary.projectSingular}
          description="Defina o ponto de partida. Tudo poderá ser ajustado depois."
          className="border-t"
        >
          <Field
            label={`Nome ${vocabulary.projectSingular === "Projeto" ? "do projeto" : "da obra"}`}
            htmlFor="direct-projectName"
            error={fieldErrors.projectName}
            required
          >
            <Input
              id="direct-projectName"
              name="project_name"
              value={draft.projectName}
              onChange={(event) => update("projectName", event.target.value)}
              placeholder={
                vocabulary.projectSingular === "Projeto"
                  ? "Ex.: Residência Maria Santos…"
                  : "Ex.: Reforma da casa de Maria…"
              }
              maxLength={200}
              autoComplete="off"
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.projectName) || undefined}
            />
          </Field>

          <div className="space-y-2">
            <Label>Situação inicial</Label>
            <div className="grid grid-cols-2 rounded-md border bg-muted/35 p-1">
              <ModeOption
                id="direct-projectStatus-planning"
                name="project-status"
                label="Em planejamento"
                checked={draft.projectStatus === "planning"}
                disabled={pending}
                onChange={() => update("projectStatus", "planning")}
              />
              <ModeOption
                id="direct-projectStatus-progress"
                name="project-status"
                label="Em andamento"
                checked={draft.projectStatus === "in_progress"}
                disabled={pending}
                onChange={() => update("projectStatus", "in_progress")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Início"
              htmlFor="direct-startsOn"
              error={fieldErrors.startsOn}
              icon={<CalendarDays />}
            >
              <Input
                id="direct-startsOn"
                name="starts_on"
                type="date"
                value={draft.startsOn}
                onChange={(event) => update("startsOn", event.target.value)}
                disabled={pending}
              />
            </Field>
            <Field
              label="Previsão de término"
              htmlFor="direct-endsOn"
              error={fieldErrors.endsOn}
              icon={<CalendarDays />}
            >
              <Input
                id="direct-endsOn"
                name="ends_on"
                type="date"
                min={draft.startsOn || undefined}
                value={draft.endsOn}
                onChange={(event) => update("endsOn", event.target.value)}
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.endsOn) || undefined}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Valor contratado"
              htmlFor="direct-budget"
              error={fieldErrors.budget}
              hint="Opcional. Serve para acompanhar custos e margem."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  R$
                </span>
                <Input
                  id="direct-budget"
                  name="budget"
                  inputMode="decimal"
                  value={draft.budget}
                  onChange={(event) => update("budget", event.target.value)}
                  placeholder="0,00…"
                  className="pl-10"
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.budget) || undefined}
                />
              </div>
            </Field>
            <Field
              label="Modelo de etapas"
              htmlFor="direct-templateId"
              error={fieldErrors.templateId}
              hint="Opcional. Você pode montar as etapas depois."
            >
              <select
                id="direct-templateId"
                name="template_id"
                value={draft.templateId}
                onChange={(event) => update("templateId", event.target.value)}
                className={SELECT_CLASS}
                disabled={pending}
              >
                <option value="">Começar sem modelo</option>
                {customTemplates.length > 0 ? (
                  <optgroup label="Meus modelos">
                    {customTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {systemTemplates.length > 0 ? (
                  <optgroup label="Modelos Prumo">
                    {systemTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </Field>
          </div>

          <details className="group rounded-md border bg-muted/20">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Detalhes do trabalho
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                Opcional
              </span>
            </summary>
            <div className="space-y-4 border-t p-3">
              <Field
                label="Endereço do trabalho"
                htmlFor="direct-projectAddress"
                error={fieldErrors.projectAddress}
                hint="Se ficar vazio, será usado o endereço do cliente quando disponível."
                icon={<MapPin />}
              >
                <Input
                  id="direct-projectAddress"
                  name="project_address"
                  value={draft.projectAddress}
                  onChange={(event) =>
                    update("projectAddress", event.target.value)
                  }
                  maxLength={300}
                  autoComplete="street-address"
                  disabled={pending}
                />
              </Field>
              <Field
                label="Descrição"
                htmlFor="direct-projectDescription"
                error={fieldErrors.projectDescription}
              >
                <Textarea
                  id="direct-projectDescription"
                  name="project_description"
                  value={draft.projectDescription}
                  onChange={(event) =>
                    update("projectDescription", event.target.value)
                  }
                  placeholder="Escopo inicial, observações ou contexto do trabalho…"
                  maxLength={2_000}
                  disabled={pending}
                />
              </Field>
            </div>
          </details>
        </FormSection>

        {error ? (
          <div
            className="mx-4 mb-4 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm text-destructive sm:mx-5"
            role="alert"
            aria-live="polite"
          >
            <p className="font-medium">{error}</p>
            {error.toLowerCase().includes("plano grátis") ? (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/app/configuracoes/plano">Ver planos</Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex flex-col-reverse gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs leading-5 text-muted-foreground">
            Cliente e {projectLabel} serão criados juntos. Nenhuma cobrança será gerada.
          </p>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <Button asChild variant="outline">
              <Link
                href="/app/obras"
                aria-disabled={pending}
                className={pending ? "pointer-events-none" : undefined}
              >
                Cancelar
              </Link>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Check aria-hidden="true" />
              )}
              {pending ? "Cadastrando…" : `Cadastrar ${projectLabel}`}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

function FormSection({
  number,
  title,
  description,
  className,
  children,
}: {
  number: string;
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
          {number}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-4 sm:pl-10">{children}</div>
    </section>
  );
}

function ModeOption({
  id,
  name,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-center rounded-[5px] px-2 text-center text-sm font-medium transition-[background-color,color,box-shadow]",
        checked
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
        {icon ? (
          <span aria-hidden="true" className="text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
            {icon}
          </span>
        ) : null}
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function mapServerFieldErrors(
  errors?: Record<string, string[]>,
): Partial<Record<DirectProjectDraftField, string>> {
  if (!errors) return {};
  const mapped: Partial<Record<DirectProjectDraftField, string>> = {};
  for (const [serverField, messages] of Object.entries(errors)) {
    const field = SERVER_FIELD_TO_DRAFT[serverField];
    if (field && messages[0]) mapped[field] = messages[0];
  }
  return mapped;
}

function firstMappedField(
  errors: Partial<Record<DirectProjectDraftField, string>>,
): DirectProjectDraftField | null {
  return (Object.keys(errors)[0] as DirectProjectDraftField | undefined) ?? null;
}

function directGoalHint(goal: ActivationGoal, projectSingular: string) {
  switch (goal) {
    case "client_briefing":
      return `Ao cadastrar, você irá direto ao Briefing para preparar e compartilhar com o cliente.`;
    case "deliverables":
      return `Ao cadastrar, você irá direto às Entregas para organizar arquivos e versões.`;
    case "execution_control":
      return `Ao cadastrar, você irá direto à Gestão para registrar custos e andamento.`;
    default:
      return `Ao cadastrar, você irá direto às etapas ${projectSingular === "Projeto" ? "do projeto" : "da obra"}.`;
  }
}
