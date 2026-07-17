"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { ConfirmDiscardDialog } from "@/components/forms/confirm-discard-dialog";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStageAction } from "./actions";
import {
  projectCommandSignature,
  validateStageDraft,
  type StageDraft,
} from "./project-command-draft";

interface AddStageFormProps {
  projectId: string;
}

const EMPTY_STAGE: StageDraft = { name: "", days: "" };
const EMPTY_STAGE_SIGNATURE = projectCommandSignature(EMPTY_STAGE);

export function AddStageForm({ projectId }: AddStageFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StageDraft>(EMPTY_STAGE);
  const [pending, startTransition] = useTransition();
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const validationErrors = useMemo(() => validateStageDraft(draft), [draft]);
  const isDirty = projectCommandSignature(draft) !== EMPTY_STAGE_SIGNATURE;
  const visibleErrors = showValidationErrors ? validationErrors : {};

  function updateDraft(patch: Partial<StageDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function resetAndClose() {
    setDraft(EMPTY_STAGE);
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
    const firstError = validationErrors.name
      ? "new-stage-name"
      : validationErrors.days
        ? "new-stage-days"
        : null;
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    startTransition(async () => {
      try {
        const result = await addStageAction(
          projectId,
          draft.name.trim(),
          draft.days === "" ? null : Number(draft.days),
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        resetAndClose();
        router.refresh();
      } catch {
        setError(
          "Não foi possível adicionar a etapa agora. Verifique sua conexão e tente novamente.",
        );
      }
    });
  }

  if (!open) {
    return (
      <div className="pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-10 w-full sm:w-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Adicionar etapa
        </Button>
      </div>
    );
  }

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            requestClose();
          }
        }}
        className="space-y-3 rounded-md border border-dashed bg-muted/20 p-3"
      >
        <ProtectedFormNavigation
          dirty={isDirty}
          contentLabel="na nova etapa"
        />

        <div className="space-y-1.5">
          <Label htmlFor="new-stage-name">Nome da etapa</Label>
          <Input
            id="new-stage-name"
            name="new-stage-name"
            autoFocus
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            placeholder="Ex: Pintura"
            maxLength={200}
            disabled={pending}
            aria-invalid={Boolean(visibleErrors.name)}
            aria-describedby={visibleErrors.name ? "new-stage-name-error" : undefined}
          />
          {visibleErrors.name && (
            <p id="new-stage-name-error" className="text-xs text-destructive">
              {visibleErrors.name}
            </p>
          )}
        </div>

        <div className="space-y-1.5 sm:max-w-48">
          <Label htmlFor="new-stage-days">
            Dias previstos{" "}
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="new-stage-days"
            name="new-stage-days"
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            value={draft.days}
            onChange={(event) => updateDraft({ days: event.target.value })}
            placeholder="Ex: 5"
            disabled={pending}
            aria-invalid={Boolean(visibleErrors.days)}
            aria-describedby={visibleErrors.days ? "new-stage-days-error" : undefined}
          />
          {visibleErrors.days && (
            <p id="new-stage-days-error" className="text-xs text-destructive">
              {visibleErrors.days}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={requestClose}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" className="h-10" disabled={pending}>
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Adicionando…
              </>
            ) : (
              "Adicionar etapa"
            )}
          </Button>
        </div>
      </form>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        contentLabel="da nova etapa"
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          resetAndClose();
        }}
      />
    </>
  );
}
