"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ClipboardList, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";
import type { ProjectStage } from "@/lib/queries/projects";
import type { StageTemplate } from "@/lib/queries/stage-templates";
import { StageRow } from "./stage-row";
import { AddStageForm } from "./add-stage-form";
import { ApplyTemplateDialog } from "./apply-template-dialog";
import { reorderStagesAction } from "./actions";

interface StagesSectionProps {
  projectId: string;
  stages: ProjectStage[];
  progressPct: number | null;
  startsOn: string | null;
  templates: StageTemplate[];
}

export function StagesSection({
  projectId,
  stages,
  progressPct,
  startsOn,
  templates,
}: StagesSectionProps) {
  const router = useRouter();
  const [movePending, startMove] = useTransition();
  const [moveError, setMoveError] = useState<string | null>(null);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const doneCount = sortedStages.filter((s) => s.status === "done").length;
  const totalCount = sortedStages.length;
  const inProgress = sortedStages.find((s) => s.status === "in_progress");

  const pct = progressPct ?? (totalCount === 0 ? 0 : (doneCount / totalCount) * 100);
  const pctClamped = Math.min(100, Math.max(0, pct));

  // Previsão de término = startsOn + soma de est_days das pendentes (todo + in_progress)
  const forecastEndDate = useMemo(() => {
    if (!startsOn) return null;
    const pendingDays = sortedStages
      .filter((s) => s.status !== "done")
      .reduce((acc, s) => acc + (s.est_days ?? 0), 0);
    if (pendingDays === 0) return null;
    // Parse YYYY-MM-DD como local midnight, soma dias, formata de volta como local YYYY-MM-DD
    const m = startsOn.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setDate(d.getDate() + pendingDays);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
  }, [sortedStages, startsOn]);

  function move(stageId: string, direction: "up" | "down") {
    const idx = sortedStages.findIndex((s) => s.id === stageId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedStages.length) return;

    const newOrder = sortedStages.slice();
    const a = newOrder[idx];
    const b = newOrder[swapIdx];
    if (!a || !b) return;
    newOrder[idx] = b;
    newOrder[swapIdx] = a;
    setMoveError(null);
    startMove(async () => {
      const r = await reorderStagesAction(
        projectId,
        newOrder.map((s) => s.id),
      );
      if (!r.ok) {
        setMoveError(r.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Andamento da obra
          </div>
          {totalCount > 0 ? (
            <div className="mt-1 text-sm">
              <strong>
                {doneCount} de {totalCount} etapa{totalCount > 1 ? "s" : ""} concluída
                {doneCount === 1 ? "" : "s"}
              </strong>
              {inProgress && (
                <span className="ml-1 text-muted-foreground">
                  · Em execução: <strong>{inProgress.name}</strong>
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              Nenhuma etapa cadastrada ainda.
            </div>
          )}
        </div>
        {forecastEndDate && (
          <div className="hidden sm:block text-right text-xs text-muted-foreground">
            <div className="flex items-center justify-end gap-1">
              <CalendarClock className="h-3 w-3" />
              previsão de término
            </div>
            <div className="font-semibold text-foreground">
              {formatDateBR(forecastEndDate)}
            </div>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pctClamped}%` }}
            role="progressbar"
            aria-valuenow={Math.round(pctClamped)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {totalCount === 0 ? (
        <div className="space-y-4 rounded-md border border-dashed bg-muted/20 p-6 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">Comece com um template</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Aplique um dos modelos prontos ou adicione etapas manualmente.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {templates.length > 0 && (
              <ApplyTemplateDialog
                projectId={projectId}
                templates={templates}
                trigger={
                  <Button>
                    <LayoutTemplate className="h-4 w-4" />
                    Aplicar template
                  </Button>
                }
              />
            )}
          </div>
          <div>
            <AddStageForm projectId={projectId} />
          </div>
        </div>
      ) : (
        <>
          <ul className="space-y-0">
            {sortedStages.map((stage, idx) => (
              <StageRow
                key={stage.id}
                stage={stage}
                canMoveUp={idx > 0}
                canMoveDown={idx < sortedStages.length - 1}
                movePending={movePending}
                onMove={(dir) => move(stage.id, dir)}
              />
            ))}
          </ul>

          {moveError && (
            <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {moveError}
            </div>
          )}

          <div className="mt-4">
            <AddStageForm projectId={projectId} />
          </div>
        </>
      )}
    </section>
  );
}
