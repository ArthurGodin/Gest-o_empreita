"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { convertToProjectAction } from "../actions";

interface ConvertToProjectProps {
  quoteId: string;
  quoteTitle: string;
}

export function ConvertToProject({
  quoteId,
  quoteTitle,
}: ConvertToProjectProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await convertToProjectAction(quoteId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/app/obras/${result.project_id}`);
        router.refresh();
      } catch (e) {
        console.error("[convert] action threw:", e);
        setError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <HardHat className="h-4 w-4" />
        Virar obra
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Virar essa obra?</DialogTitle>
            <DialogDescription>
              Vamos criar uma obra a partir do orçamento{" "}
              <strong>{quoteTitle}</strong>. Cliente, endereço e valor previsto
              já vêm preenchidos. Você poderá adicionar etapas, fotos e ponto de
              equipe depois.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? "Criando obra..." : "Confirmar e criar obra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
