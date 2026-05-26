"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateBR } from "@/lib/utils";
import type { ProjectStage } from "@/lib/queries/projects";
import type { StageStatus } from "@/lib/supabase/types";
import {
  deleteStageAction,
  setStageStatusAction,
  updateStageAction,
} from "./actions";

interface StageRowProps {
  stage: ProjectStage;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
  movePending: boolean;
}

const STATUS_PILL: Record<StageStatus, { label: string; class: string }> = {
  todo: { label: "A fazer", class: "bg-muted text-muted-foreground" },
  in_progress: {
    label: "Em execução",
    class:
      "bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  },
  done: {
    label: "Feito",
    class:
      "bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  },
};

export function StageRow({
  stage,
  canMoveUp,
  canMoveDown,
  onMove,
  movePending,
}: StageRowProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [name, setName] = useState(stage.name);
  const [estDays, setEstDays] = useState(stage.est_days?.toString() ?? "");
  const [notes, setNotes] = useState(stage.notes ?? "");

  const pill = STATUS_PILL[stage.status];

  function quickToggle() {
    const next: StageStatus = stage.status === "done" ? "todo" : "done";
    setError(null);
    startTransition(async () => {
      const r = await setStageStatusAction(stage.id, next);
      if (!r.ok) {
        setError(r.error);
      } else {
        router.refresh();
      }
    });
  }

  function setStatus(next: StageStatus) {
    setError(null);
    startTransition(async () => {
      const r = await setStageStatusAction(stage.id, next);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function saveEdit() {
    setError(null);
    const parsedDays = estDays === "" ? null : Number.parseInt(estDays, 10);
    if (parsedDays !== null && (Number.isNaN(parsedDays) || parsedDays < 1)) {
      setError("Dias previstos inválidos.");
      return;
    }
    startTransition(async () => {
      const r = await updateStageAction(stage.id, {
        name: name.trim(),
        est_days: parsedDays,
        notes: notes.trim(),
      });
      if (!r.ok) {
        setError(r.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function cancelEdit() {
    setName(stage.name);
    setEstDays(stage.est_days?.toString() ?? "");
    setNotes(stage.notes ?? "");
    setEditing(false);
    setError(null);
  }

  function doDelete() {
    setError(null);
    startTransition(async () => {
      const r = await deleteStageAction(stage.id);
      if (!r.ok) {
        setError(r.error);
        setConfirmingDelete(false);
      } else {
        router.refresh();
      }
    });
  }

  const rowClass =
    stage.status === "in_progress"
      ? "bg-amber-50 dark:bg-amber-950/20 rounded-md -mx-2 px-2"
      : "";

  return (
    <li className={`border-b last:border-0 ${rowClass}`}>
      <div className="flex items-center gap-3 py-3">
        <button
          type="button"
          onClick={quickToggle}
          disabled={pending}
          aria-label={
            stage.status === "done" ? "Reabrir etapa" : "Marcar como concluída"
          }
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
            stage.status === "done"
              ? "border-green-600 bg-green-600 text-white"
              : "border-input hover:border-foreground"
          }`}
        >
          {stage.status === "done" && <Check className="h-3 w-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{stage.name}</div>
          <div className="text-xs text-muted-foreground">
            {stage.status === "done" && stage.completed_on && (
              <span>Concluído em {formatDateBR(stage.completed_on)}</span>
            )}
            {stage.status === "in_progress" && (
              <span>
                Em execução
                {stage.started_on && ` · desde ${formatDateBR(stage.started_on)}`}
              </span>
            )}
            {stage.status === "todo" && stage.est_days && (
              <span>Previsto · {stage.est_days} dia{stage.est_days > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <span
          className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.class}`}
        >
          {pill.label}
        </span>

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={movePending || !canMoveUp}
            onClick={() => onMove("up")}
            aria-label="Mover etapa para cima"
            className="h-8 w-8"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={movePending || !canMoveDown}
            onClick={() => onMove("down")}
            aria-label="Mover etapa para baixo"
            className="h-8 w-8"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Editar etapa"
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 pb-4 pl-8 pr-2 text-sm">
          {!editing && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Button
                  size="sm"
                  variant={stage.status === "todo" ? "default" : "outline"}
                  onClick={() => setStatus("todo")}
                  disabled={pending}
                >
                  A fazer
                </Button>
                <Button
                  size="sm"
                  variant={stage.status === "in_progress" ? "default" : "outline"}
                  onClick={() => setStatus("in_progress")}
                  disabled={pending}
                >
                  Em execução
                </Button>
                <Button
                  size="sm"
                  variant={stage.status === "done" ? "default" : "outline"}
                  onClick={() => setStatus("done")}
                  disabled={pending}
                >
                  Feito
                </Button>
              </div>
              {stage.notes && (
                <div className="rounded-md bg-muted/40 p-2 text-sm">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Notas
                  </div>
                  {stage.notes}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  disabled={pending}
                >
                  Editar
                </Button>
                {!confirmingDelete ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={pending || stage.status !== "todo"}
                    title={
                      stage.status !== "todo"
                        ? "Volte para 'A fazer' antes de apagar"
                        : undefined
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Apagar
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={doDelete}
                      disabled={pending}
                    >
                      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={pending}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {editing && (
            <div className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da etapa"
                disabled={pending}
              />
              <Input
                type="number"
                min={1}
                max={365}
                value={estDays}
                onChange={(e) => setEstDays(e.target.value)}
                placeholder="Dias previstos (opcional)"
                disabled={pending}
              />
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas (opcional)"
                rows={2}
                disabled={pending}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveEdit} disabled={pending}>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={pending}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
