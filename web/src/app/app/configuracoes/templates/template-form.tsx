"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { ConfirmDiscardDialog } from "@/components/forms/confirm-discard-dialog";
import { FormSaveBar } from "@/components/forms/form-save-bar";
import type { FormSaveStatus } from "@/components/forms/form-save-status";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatSavedTime } from "@/lib/form-draft";
import { createTemplateAction, updateTemplateAction } from "./actions";
import {
  initialTemplateDraft,
  templateDraftPayload,
  templateDraftSignature,
  validateTemplateDraft,
  type TemplateDraft,
  type TemplateItemDraft,
} from "./template-draft";

interface TemplateFormProps {
  templateId?: string;
  initialName?: string;
  initialDescription?: string;
  initialItems?: Array<{ name: string; est_days: number | null }>;
  onSaved: () => void;
  onCancel: () => void;
}

export function TemplateForm({
  templateId,
  initialName = "",
  initialDescription = "",
  initialItems = [{ name: "", est_days: null }],
  onSaved,
  onCancel,
}: TemplateFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<TemplateDraft>(() =>
    initialTemplateDraft(initialName, initialDescription, initialItems),
  );
  const [savedSignature, setSavedSignature] = useState(() =>
    templateDraftSignature(
      initialTemplateDraft(initialName, initialDescription, initialItems),
    ),
  );
  const [operationState, setOperationState] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const currentSignature = useMemo(
    () => templateDraftSignature(draft),
    [draft],
  );
  const validation = useMemo(() => validateTemplateDraft(draft), [draft]);
  const isDirty = currentSignature !== savedSignature;
  const saving = pending || operationState === "saving";
  const saveStatus: FormSaveStatus = saving
    ? "saving"
    : operationState === "error"
      ? "error"
      : isDirty
        ? "dirty"
        : "saved";

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

  function updateDraft(patch: Partial<TemplateDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setOperationState("idle");
    setError(null);
  }

  function addItem() {
    if (draft.items.length >= 30) {
      setError("Cada modelo pode ter no máximo 30 etapas.");
      setOperationState("error");
      return;
    }
    const item: TemplateItemDraft = {
      key: crypto.randomUUID(),
      name: "",
      estDays: "",
    };
    updateDraft({ items: [...draft.items, item] });
    setFocusTarget(`template-item-name-${item.key}`);
  }

  function updateItem(key: string, patch: Partial<TemplateItemDraft>) {
    updateDraft({
      items: draft.items.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeItem(key: string) {
    if (draft.items.length <= 1) return;
    updateDraft({ items: draft.items.filter((item) => item.key !== key) });
  }

  function moveItem(index: number, direction: "up" | "down") {
    const destination = direction === "up" ? index - 1 : index + 1;
    if (destination < 0 || destination >= draft.items.length) return;
    const items = [...draft.items];
    const sourceItem = items[index];
    const destinationItem = items[destination];
    if (!sourceItem || !destinationItem) return;
    items[index] = destinationItem;
    items[destination] = sourceItem;
    updateDraft({ items });
  }

  function requestCancel() {
    if (saving) return;
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onCancel();
  }

  function submit() {
    setError(null);
    setShowValidationErrors(true);
    if (!validation.ok) {
      setOperationState("error");
      setFocusTarget(validation.firstFieldId);
      return;
    }
    if (!isDirty || saving) return;

    setOperationState("saving");
    startTransition(async () => {
      try {
        const payload = templateDraftPayload(draft);
        const result = templateId
          ? await updateTemplateAction(templateId, payload)
          : await createTemplateAction(payload);
        if (!result.ok) {
          setError(result.error);
          setOperationState("error");
          return;
        }

        setSavedSignature(currentSignature);
        setLastSavedAt(new Date());
        setShowValidationErrors(false);
        setOperationState("idle");
        router.refresh();
        onSaved();
      } catch {
        setError(
          "Não foi possível salvar o modelo agora. Verifique sua conexão e tente novamente.",
        );
        setOperationState("error");
      }
    });
  }

  const visibleErrors = showValidationErrors ? validation.errors : {};

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4 rounded-lg border bg-card p-4 sm:p-5"
      >
        <ProtectedFormNavigation dirty={isDirty} contentLabel="neste modelo" />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Nome do modelo</Label>
            <Input
              id="template-name"
              name="template-name"
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="Ex: Telhado industrial"
              maxLength={100}
              disabled={saving}
              aria-invalid={Boolean(visibleErrors.name)}
              aria-describedby={visibleErrors.name ? "template-name-error" : undefined}
            />
            {visibleErrors.name && (
              <p id="template-name-error" className="text-xs text-destructive">
                {visibleErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-description">
              Descrição <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="template-description"
              name="template-description"
              value={draft.description}
              onChange={(event) =>
                updateDraft({ description: event.target.value })
              }
              placeholder="Quando este modelo deve ser usado"
              maxLength={500}
              rows={2}
              disabled={saving}
              aria-invalid={Boolean(visibleErrors.description)}
              aria-describedby={
                visibleErrors.description ? "template-description-error" : undefined
              }
            />
            {visibleErrors.description && (
              <p
                id="template-description-error"
                className="text-xs text-destructive"
              >
                {visibleErrors.description}
              </p>
            )}
          </div>
        </div>

        <section className="space-y-2.5" aria-labelledby="template-items-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="template-items-title" className="text-sm font-medium">
                Etapas em ordem
              </h3>
              <p className="text-xs text-muted-foreground">
                {draft.items.length} de 30 etapas
              </p>
            </div>
            <Button
              id="add-template-item"
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={addItem}
              disabled={saving || draft.items.length >= 30}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <ol className="space-y-2">
            {draft.items.map((item, index) => {
              const itemErrors = visibleErrors.items?.[item.key];
              const nameId = `template-item-name-${item.key}`;
              const daysId = `template-item-days-${item.key}`;
              return (
                <li
                  key={item.key}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-2 rounded-md border bg-background p-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_6.5rem_2.75rem]"
                >
                  <div className="flex flex-col" aria-label={`Ordenar etapa ${index + 1}`}>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      onClick={() => moveItem(index, "up")}
                      disabled={saving || index === 0}
                      aria-label={`Mover etapa ${index + 1} para cima`}
                    >
                      <ChevronUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      onClick={() => moveItem(index, "down")}
                      disabled={saving || index === draft.items.length - 1}
                      aria-label={`Mover etapa ${index + 1} para baixo`}
                    >
                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={nameId} className="sr-only">
                      Nome da etapa {index + 1}
                    </Label>
                    <Input
                      id={nameId}
                      name={nameId}
                      value={item.name}
                      onChange={(event) =>
                        updateItem(item.key, { name: event.target.value })
                      }
                      placeholder={`Etapa ${index + 1}: ex. Montagem`}
                      maxLength={200}
                      disabled={saving}
                      aria-invalid={Boolean(itemErrors?.name)}
                      aria-describedby={itemErrors?.name ? `${nameId}-error` : undefined}
                    />
                    {itemErrors?.name && (
                      <p id={`${nameId}-error`} className="text-xs text-destructive">
                        {itemErrors.name}
                      </p>
                    )}
                  </div>

                  <div className="col-start-2 space-y-1 sm:col-start-auto">
                    <Label htmlFor={daysId} className="sr-only">
                      Dias previstos da etapa {index + 1}
                    </Label>
                    <Input
                      id={daysId}
                      name={daysId}
                      type="number"
                      min={1}
                      max={365}
                      inputMode="numeric"
                      value={item.estDays}
                      onChange={(event) =>
                        updateItem(item.key, { estDays: event.target.value })
                      }
                      placeholder="Dias"
                      disabled={saving}
                      aria-invalid={Boolean(itemErrors?.estDays)}
                      aria-describedby={
                        itemErrors?.estDays ? `${daysId}-error` : undefined
                      }
                    />
                    {itemErrors?.estDays && (
                      <p id={`${daysId}-error`} className="text-xs text-destructive">
                        {itemErrors.estDays}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="row-span-2 h-11 w-11 text-muted-foreground hover:text-destructive sm:row-span-1"
                    onClick={() => removeItem(item.key)}
                    disabled={saving || draft.items.length <= 1}
                    aria-label={`Remover etapa ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ol>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <FormSaveBar
          status={saveStatus}
          lastSavedLabel={formatSavedTime(lastSavedAt)}
          onSave={submit}
          saveDisabled={saving || !isDirty}
          saveLabel="Salvar modelo"
          savingLabel="Salvando modelo…"
          savedLabel={templateId ? "Modelo atualizado" : "Novo modelo ainda vazio"}
          savedHint={
            templateId
              ? "Este modelo está sincronizado com o servidor."
              : "Preencha os campos para criar o modelo."
          }
          dirtyHint="Salve o modelo para preservar a ordem e as etapas."
          secondaryAction={
            <Button
              type="button"
              variant="outline"
              onClick={requestCancel}
              disabled={saving}
            >
              Cancelar
            </Button>
          }
        />
      </form>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        contentLabel="deste modelo"
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onCancel();
        }}
      />
    </>
  );
}
