"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteQuoteAction } from "../actions";

interface DeleteQuoteButtonProps {
  id: string;
  number: string;
}

export function DeleteQuoteButton({ id, number }: DeleteQuoteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteQuoteAction(id);
        if (!result.ok) {
          setError(result.error ?? "Não foi possível apagar.");
          return;
        }
        setOpen(false);
        router.push("/app/orcamentos");
        router.refresh();
      } catch (e) {
        console.error("[delete-quote] action threw:", e);
        setError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Apagar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apagar rascunho?</DialogTitle>
          <DialogDescription>
            O orçamento{" "}
            <span className="font-mono font-medium text-foreground">{number}</span>{" "}
            será apagado pra sempre, incluindo todos os itens. Essa ação não pode
            ser desfeita. Só dá pra apagar rascunhos.
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
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Apagando..." : "Sim, apagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
