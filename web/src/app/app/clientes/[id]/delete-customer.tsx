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
import { deleteCustomerAction } from "../actions";

interface DeleteCustomerProps {
  id: string;
  customerName: string;
}

export function DeleteCustomer({ id, customerName }: DeleteCustomerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteCustomerAction(id);
        if (!result.ok) {
          setError(result.error ?? "Não foi possível apagar.");
          return;
        }
        setOpen(false);
        router.push("/app/clientes");
        router.refresh();
      } catch (err) {
        // Falha de rede / 500 do server action — não deixar o modal travado.
        console.error("[delete-customer] action threw:", err);
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
          <DialogTitle>Apagar cliente?</DialogTitle>
          <DialogDescription>
            Você está prestes a apagar{" "}
            <span className="font-medium text-foreground">{customerName}</span>. Essa
            ação não pode ser desfeita. Se este cliente tiver obras vinculadas, o
            apagamento será bloqueado.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Apagando…" : "Sim, apagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
