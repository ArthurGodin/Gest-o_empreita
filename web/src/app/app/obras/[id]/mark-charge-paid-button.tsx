"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { formatBRL } from "@/lib/utils";
import { useBusinessVocabulary } from "@/components/business-segment-context";
import { markChargePaidManuallyAction } from "./actions";

interface MarkChargePaidButtonProps {
  chargeId: string;
  amountCents: number;
  label?: string;
  className?: string;
}

export function MarkChargePaidButton({
  chargeId,
  amountCents,
  label = "Marcar como recebido",
  className,
}: MarkChargePaidButtonProps) {
  const vocabulary = useBusinessVocabulary();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await markChargePaidManuallyAction(chargeId, note);
      if (!result.ok) {
        setError(result.error);
        toast({
          variant: "destructive",
          title: "Recebimento não registrado",
          description: result.error,
        });
        return;
      }

      toast({
        title: "Recebimento confirmado",
        description: `A parcela entrou como recebida no financeiro ${
          vocabulary.projectSingular === "Projeto"
            ? "do projeto"
            : "da obra"
        }.`,
      });
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className={className}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar recebimento</DialogTitle>
          <DialogDescription>
            Use esta baixa manual somente depois de conferir o pagamento no
            extrato da sua conta. O financeiro vai considerar esta parcela como
            recebida.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Valor da parcela
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {formatBRL(amountCents / 100)}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`manual-paid-note-${chargeId}`}
            className="text-sm font-medium"
          >
            Observação interna
          </label>
          <Textarea
            id={`manual-paid-note-${chargeId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={300}
            placeholder="Ex.: Recebido via Pix em 15/06, conferido no app do banco."
          />
          <p className="text-xs text-muted-foreground">
            Esta observação não aparece para o cliente.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
