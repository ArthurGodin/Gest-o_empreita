"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormSaveStatus } from "./form-save-status";

interface FormSaveBarProps {
  status: FormSaveStatus;
  lastSavedLabel?: string | null;
  onSave: () => void;
  saveDisabled: boolean;
  saveLabel?: string;
  savingLabel?: string;
  savedLabel?: string;
  dirtyHint?: string;
  secondaryAction?: ReactNode;
}

export function FormSaveBar({
  status,
  lastSavedLabel,
  onSave,
  saveDisabled,
  saveLabel = "Salvar alterações",
  savingLabel = "Salvando…",
  savedLabel = "Dados salvos",
  dirtyHint = "Salve antes de sair desta tela.",
  secondaryAction,
}: FormSaveBarProps) {
  const content = saveStatusContent(status, lastSavedLabel, savedLabel);

  return (
    <>
      <div aria-hidden="true" className="h-24 sm:hidden" />
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 -mb-4 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.06)] backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" aria-live="polite">
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold ${content.className}`}
            >
              {content.icon}
              <span>{content.label}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {status === "dirty"
                ? dirtyHint
                : status === "error"
                  ? "Revise o erro e tente novamente."
                  : status === "saving"
                    ? "Aguarde a confirmação do servidor."
                    : "As informações desta seção estão atualizadas."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            {secondaryAction}
            <Button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              className={secondaryAction ? undefined : "col-span-2 sm:col-span-1"}
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {status === "saving" ? savingLabel : saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function saveStatusContent(
  status: FormSaveStatus,
  lastSavedLabel: string | null | undefined,
  savedLabel: string,
) {
  switch (status) {
    case "dirty":
      return {
        label: "Alterações não salvas",
        className: "text-amber-700",
        icon: <AlertCircle aria-hidden="true" className="h-4 w-4" />,
      };
    case "saving":
      return {
        label: savingLabelForStatus(),
        className: "text-primary",
        icon: (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 motion-safe:animate-spin"
          />
        ),
      };
    case "error":
      return {
        label: "Falha ao salvar",
        className: "text-destructive",
        icon: <AlertCircle aria-hidden="true" className="h-4 w-4" />,
      };
    default:
      return {
        label: lastSavedLabel ? `Salvo às ${lastSavedLabel}` : savedLabel,
        className: "text-emerald-700",
        icon: <CheckCircle2 aria-hidden="true" className="h-4 w-4" />,
      };
  }
}

function savingLabelForStatus() {
  return "Salvando…";
}
