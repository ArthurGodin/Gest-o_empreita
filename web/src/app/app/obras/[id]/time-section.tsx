"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, MapPin, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateBR } from "@/lib/utils";
import type { TimeEntry } from "@/lib/queries/projects";
import { todayBR } from "@/lib/dates";
import { TimeForm } from "./time-form";
import { deleteTimeEntryAction, endTimeEntryAction } from "./actions";

function hhmm(t: string | null): string {
  if (!t) return "—";
  // Formato vem do Postgres como "07:30:00"; pega 5 chars
  return t.slice(0, 5);
}

interface TimeSectionProps {
  projectId: string;
  today: TimeEntry[];
  historyCount: number;
}

export function TimeSection({ projectId, today, historyCount }: TimeSectionProps) {
  const total = today.reduce(
    (acc, t) => acc + (t.hours_worked ?? 0),
    0,
  );

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ponto da equipe (encarregado bate por todos)
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDateBR(todayBR())}
        </div>
      </div>

      {today.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Ninguém bateu ponto ainda hoje.
          <div className="mt-3">
            <TimeForm projectId={projectId} />
          </div>
        </div>
      ) : (
        <>
          <ul className="space-y-1">
            {today.map((entry) => (
              <TimeRow key={entry.id} entry={entry} />
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
            <div className="text-muted-foreground">
              Total do dia ·{" "}
              <strong className="text-foreground">{total.toFixed(2)}h</strong>
            </div>
            <TimeForm projectId={projectId} />
          </div>
        </>
      )}

      {historyCount > today.length && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          {historyCount - today.length} ponto
          {historyCount - today.length === 1 ? "" : "s"} em dias anteriores
        </div>
      )}
    </section>
  );
}

function TimeRow({ entry }: { entry: TimeEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [endingOpen, setEndingOpen] = useState(false);
  const [endedAtInput, setEndedAtInput] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  function doDelete() {
    setError(null);
    startTransition(async () => {
      const r = await deleteTimeEntryAction(entry.id);
      if (!r.ok) {
        setError(r.error);
        setConfirming(false);
      } else router.refresh();
    });
  }

  function doEnd() {
    setError(null);
    startTransition(async () => {
      const r = await endTimeEntryAction(entry.id, endedAtInput);
      if (!r.ok) {
        setError(r.error);
      } else {
        setEndingOpen(false);
        router.refresh();
      }
    });
  }

  const isOpen = entry.ended_at === null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{entry.worker_name}</span>
          {entry.worker_role && (
            <span className="text-[10px] text-muted-foreground">
              ({entry.worker_role})
            </span>
          )}
          {entry.gps_lat != null && (
            <MapPin className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {hhmm(entry.started_at)} → {hhmm(entry.ended_at)}
          {entry.hours_worked != null && (
            <span>· {entry.hours_worked.toFixed(2)}h</span>
          )}
          {isOpen && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              em aberto
            </span>
          )}
        </div>
        {error && <div className="text-[10px] text-destructive">{error}</div>}
      </div>

      {isOpen && !endingOpen && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setEndingOpen(true)}
          disabled={pending}
        >
          Fechar ponto
        </Button>
      )}
      {endingOpen && (
        <div className="flex items-center gap-1">
          <Input
            type="time"
            value={endedAtInput}
            onChange={(e) => setEndedAtInput(e.target.value)}
            className="h-7 w-24 text-xs"
            disabled={pending}
          />
          <Button
            size="sm"
            onClick={doEnd}
            disabled={pending}
            className="h-7 text-xs"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEndingOpen(false)}
            disabled={pending}
            className="h-7 text-xs"
          >
            Cancelar
          </Button>
        </div>
      )}
      {!confirming ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setConfirming(true)}
          aria-label="Apagar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="destructive"
            onClick={doDelete}
            disabled={pending}
            className="h-7 text-xs"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="h-7 text-xs"
          >
            Não
          </Button>
        </div>
      )}
    </li>
  );
}
