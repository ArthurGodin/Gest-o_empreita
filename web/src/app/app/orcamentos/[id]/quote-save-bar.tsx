import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";

export type QuoteSaveStatus = "saved" | "dirty" | "saving" | "error";

export function QuoteSaveBar({
  status,
  lastSavedLabel,
  totalCents,
  ready,
  nextBlocker,
  onSave,
  saveDisabled,
  sendAction,
}: {
  status: QuoteSaveStatus;
  lastSavedLabel: string | null;
  totalCents: number;
  ready: boolean;
  nextBlocker: string | null;
  onSave: () => void;
  saveDisabled: boolean;
  sendAction: ReactNode;
}) {
  const statusContent = saveStatusContent(status, lastSavedLabel);

  return (
    <>
      <div aria-hidden="true" className="h-[7.75rem] lg:h-20" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:left-56 lg:bottom-4">
        <div className="mx-auto w-full max-w-[1184px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border bg-background/95 p-3 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-muted/50 px-3 py-2 lg:min-w-[26rem] lg:bg-transparent lg:p-0">
                <div className="min-w-0" aria-live="polite">
                  <div
                    className={`flex items-center gap-1.5 text-xs font-semibold ${statusContent.className}`}
                  >
                    {statusContent.icon}
                    <span className="truncate">{statusContent.label}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-muted-foreground">
                    {ready
                      ? status === "dirty"
                        ? "Pronto para salvar e enviar."
                        : "Pronto para enviar."
                      : nextBlocker
                        ? `Para enviar: ${nextBlocker}.`
                        : "Complete os dados antes do envio."}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">
                    Total
                  </div>
                  <div className="text-lg font-bold tabular-nums text-primary">
                    {formatBRL(totalCents / 100)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[0.8fr_1.2fr] items-center gap-2 sm:flex sm:flex-row lg:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSave}
                  disabled={saveDisabled}
                  className="h-11 px-3"
                >
                  <Save aria-hidden="true" className="h-4 w-4" />
                  {status === "saving" ? (
                    "Salvando…"
                  ) : (
                    <>
                      <span className="sm:hidden">Salvar</span>
                      <span className="hidden sm:inline">Salvar rascunho</span>
                    </>
                  )}
                </Button>
                {sendAction}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function saveStatusContent(
  status: QuoteSaveStatus,
  lastSavedLabel: string | null,
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
        label: "Salvando…",
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
        label: lastSavedLabel ? `Salvo às ${lastSavedLabel}` : "Rascunho salvo",
        className: "text-emerald-700",
        icon: <CheckCircle2 aria-hidden="true" className="h-4 w-4" />,
      };
  }
}
