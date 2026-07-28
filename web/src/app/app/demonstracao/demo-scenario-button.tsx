"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { trackProductEvent } from "@/lib/product-analytics";
import { prepareDemoKitAction } from "@/app/app/configuracoes/diagnostico/actions";

export function DemoScenarioButton({
  hasScenario,
}: {
  hasScenario: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const Icon = hasScenario ? RotateCcw : PlayCircle;

  function prepareScenario() {
    startTransition(async () => {
      const result = await prepareDemoKitAction();
      if (!result.ok) {
        toast({
          title: "Não foi possível preparar o cenário",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      trackProductEvent(
        result.reused ? "demo_kit_restored" : "demo_kit_prepared",
        { source: "demo_center" },
      );
      toast({
        title: result.reused ? "Cenário restaurado" : "Cenário preparado",
        description:
          "Os dados oficiais da demonstração estão prontos para apresentar.",
        variant: "success",
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={hasScenario ? "outline" : "default"}
          className="w-full sm:w-auto"
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {hasScenario ? "Restaurar cenário" : "Preparar cenário"}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <DialogHeader>
          <DialogTitle>
            {hasScenario ? "Restaurar cenário oficial?" : "Preparar cenário?"}
          </DialogTitle>
          <DialogDescription className="leading-6">
            {hasScenario
              ? "O Prumo atualizará os registros oficiais da demonstração. Outros testes criados nesta conta não serão apagados."
              : "O Prumo criará cliente, proposta, projeto, entregas, custos e financeiro fictícios dentro deste ambiente protegido."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:space-x-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={prepareScenario}
            disabled={pending}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Icon aria-hidden="true" className="h-4 w-4" />
            )}
            {pending
              ? "Preparando..."
              : hasScenario
                ? "Restaurar"
                : "Preparar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
