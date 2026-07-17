"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { ConfirmDiscardDialog } from "@/components/forms/confirm-discard-dialog";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayBR } from "@/lib/dates";
import type { ProjectStage } from "@/lib/queries/projects";
import type { CostCategory } from "@/lib/supabase/types";
import { addCostAction } from "./actions";
import {
  parseBRLToCents,
  projectCommandSignature,
  validateCostDraft,
  type CostDraft,
} from "./project-command-draft";

const CATEGORY_OPTIONS: { value: CostCategory; label: string }[] = [
  { value: "material", label: "Material" },
  { value: "labor", label: "Mão de obra" },
  { value: "freight", label: "Frete" },
  { value: "other", label: "Outros" },
];

interface CostFormProps {
  projectId: string;
  stages: ProjectStage[];
}

export function CostForm({ projectId, stages }: CostFormProps) {
  const router = useRouter();
  const inProgressStage = stages.find((stage) => stage.status === "in_progress");
  const createInitialDraft = (): CostDraft => ({
    category: "material",
    description: "",
    amount: "",
    incurredOn: todayBR(),
    stageId: inProgressStage?.id ?? "__none__",
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CostDraft>(createInitialDraft);
  const [savedSignature, setSavedSignature] = useState(() =>
    projectCommandSignature(createInitialDraft()),
  );
  const [pending, startTransition] = useTransition();
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const validationErrors = useMemo(() => validateCostDraft(draft), [draft]);
  const currentSignature = projectCommandSignature(draft);
  const isDirty = currentSignature !== savedSignature;
  const visibleErrors = showValidationErrors ? validationErrors : {};

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

  function updateDraft(patch: Partial<CostDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function resetAndClose() {
    const initial = createInitialDraft();
    setDraft(initial);
    setSavedSignature(projectCommandSignature(initial));
    setShowValidationErrors(false);
    setError(null);
    setOpen(false);
  }

  function requestClose() {
    if (pending) return;
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    resetAndClose();
  }

  function submit() {
    setError(null);
    setShowValidationErrors(true);
    const firstError = validationErrors.description
      ? "cost-description"
      : validationErrors.amount
        ? "cost-amount"
        : validationErrors.incurredOn
          ? "cost-date"
          : null;
    if (firstError) {
      setFocusTarget(firstError);
      return;
    }

    const amountCents = parseBRLToCents(draft.amount);
    if (amountCents === null) return;

    startTransition(async () => {
      try {
        const result = await addCostAction(projectId, {
          category: draft.category,
          description: draft.description.trim(),
          amount_cents: amountCents,
          stage_id: draft.stageId === "__none__" ? null : draft.stageId,
          incurred_on: draft.incurredOn,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        resetAndClose();
        router.refresh();
      } catch {
        setError(
          "Não foi possível lançar o gasto agora. Verifique sua conexão e tente novamente.",
        );
      }
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true);
          else requestClose();
        }}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-10"
          onClick={() => setOpen(true)}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Lançar gasto
        </Button>

        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
          <ProtectedFormNavigation dirty={isDirty} contentLabel="neste gasto" />
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="text-base">Lançar gasto</DialogTitle>
            <DialogDescription>
              Registre o custo real para acompanhar a margem desta obra.
            </DialogDescription>
          </DialogHeader>

          <form
            id="cost-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cost-category">Categoria</Label>
              <select
                id="cost-category"
                name="cost-category"
                value={draft.category}
                onChange={(event) =>
                  updateDraft({ category: event.target.value as CostCategory })
                }
                disabled={pending}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cost-description">Descrição</Label>
              <Input
                id="cost-description"
                name="cost-description"
                autoFocus
                value={draft.description}
                onChange={(event) =>
                  updateDraft({ description: event.target.value })
                }
                placeholder="Ex: Telha cerâmica"
                maxLength={200}
                disabled={pending}
                aria-invalid={Boolean(visibleErrors.description)}
                aria-describedby={
                  visibleErrors.description ? "cost-description-error" : undefined
                }
              />
              {visibleErrors.description && (
                <p id="cost-description-error" className="text-xs text-destructive">
                  {visibleErrors.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cost-amount">Valor (R$)</Label>
                <Input
                  id="cost-amount"
                  name="cost-amount"
                  value={draft.amount}
                  onChange={(event) => updateDraft({ amount: event.target.value })}
                  placeholder="1.234,56"
                  inputMode="decimal"
                  disabled={pending}
                  aria-invalid={Boolean(visibleErrors.amount)}
                  aria-describedby={visibleErrors.amount ? "cost-amount-error" : undefined}
                />
                {visibleErrors.amount && (
                  <p id="cost-amount-error" className="text-xs text-destructive">
                    {visibleErrors.amount}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cost-date">Data</Label>
                <Input
                  id="cost-date"
                  name="cost-date"
                  type="date"
                  value={draft.incurredOn}
                  onChange={(event) =>
                    updateDraft({ incurredOn: event.target.value })
                  }
                  disabled={pending}
                  aria-invalid={Boolean(visibleErrors.incurredOn)}
                  aria-describedby={
                    visibleErrors.incurredOn ? "cost-date-error" : undefined
                  }
                />
                {visibleErrors.incurredOn && (
                  <p id="cost-date-error" className="text-xs text-destructive">
                    {visibleErrors.incurredOn}
                  </p>
                )}
              </div>
            </div>

            {stages.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="cost-stage">Etapa vinculada</Label>
                <select
                  id="cost-stage"
                  name="cost-stage"
                  value={draft.stageId}
                  onChange={(event) => updateDraft({ stageId: event.target.value })}
                  disabled={pending}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm"
                >
                  <option value="__none__">Sem vínculo</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.status === "in_progress" ? "Em execução · " : ""}
                      {stage.name}
                    </option>
                  ))}
                </select>
                {inProgressStage && draft.stageId === "__none__" && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto justify-start p-0 text-xs"
                    onClick={() => updateDraft({ stageId: inProgressStage.id })}
                  >
                    Vincular à etapa em execução: {inProgressStage.name}
                  </Button>
                )}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
          </form>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={requestClose}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" form="cost-form" className="h-11" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Lançando…
                </>
              ) : (
                "Lançar gasto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        contentLabel="deste gasto"
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          resetAndClose();
        }}
      />
    </>
  );
}
