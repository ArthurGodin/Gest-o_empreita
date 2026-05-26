"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROJECT_STATUS_LABEL,
  canTransitionStatus,
} from "@/lib/project-status";
import type { ProjectStatus } from "@/lib/supabase/types";
import { updateProjectStatusAction } from "./actions";

interface StatusMenuProps {
  projectId: string;
  current: ProjectStatus;
}

const TRANSITIONS_FROM: Record<ProjectStatus, ProjectStatus[]> = {
  planning: ["in_progress", "cancelled"],
  in_progress: ["paused", "completed", "cancelled"],
  paused: ["in_progress", "cancelled"],
  completed: [],
  cancelled: ["planning"],
};

export function StatusMenu({ projectId, current }: StatusMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState<ProjectStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options = TRANSITIONS_FROM[current];

  function go(to: ProjectStatus) {
    setOpen(false);
    if (to === "paused") {
      setPauseOpen(true);
      return;
    }
    if (to === "cancelled" || to === "completed") {
      setConfirmOpen(to);
      return;
    }
    runTransition(to);
  }

  function runTransition(to: ProjectStatus, reason?: string) {
    setError(null);
    startTransition(async () => {
      const r = await updateProjectStatusAction(projectId, to, reason);
      if (!r.ok) {
        setError(r.error);
      } else {
        setPauseOpen(false);
        setConfirmOpen(null);
        router.refresh();
      }
    });
  }

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
      >
        Mudar status
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border bg-popover p-1 text-sm shadow-md"
          onMouseLeave={() => setOpen(false)}
        >
          {options.map((to) => (
            <button
              key={to}
              type="button"
              onClick={() => go(to)}
              disabled={pending || !canTransitionStatus(current, to)}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
            >
              {PROJECT_STATUS_LABEL[to]}
            </button>
          ))}
        </div>
      )}

      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar obra</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Motivo <span className="text-xs text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Ex: cliente sumiu, chuva, atraso de material"
              rows={3}
              maxLength={500}
              disabled={pending}
            />
            <div className="text-xs text-muted-foreground">
              Se houver motivo, vai virar entrada de diário automaticamente.
            </div>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPauseOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => runTransition("paused", pauseReason)}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pausar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen !== null}
        onOpenChange={(o) => !o && setConfirmOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmOpen === "cancelled"
                ? "Cancelar obra?"
                : "Marcar obra como concluída?"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {confirmOpen === "cancelled" ? (
              <p>
                Cancelar obra é raro e pode confundir o cliente que está
                acompanhando pelo link público. Tem certeza?
              </p>
            ) : (
              <p>
                Marcar como concluída encerra a obra. O cliente vai ver
                &ldquo;Obra concluída&rdquo; no link público.
              </p>
            )}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(null)}
              disabled={pending}
            >
              Voltar
            </Button>
            <Button
              variant={confirmOpen === "cancelled" ? "destructive" : "default"}
              onClick={() => confirmOpen && runTransition(confirmOpen)}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmOpen === "cancelled" ? (
                "Cancelar obra"
              ) : (
                "Marcar concluída"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
