"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cancelCurrentPlanAction } from "./actions";

export function CancelPlanButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function cancelPlan() {
    const confirmed = window.confirm(
      "Cancelar a assinatura agora? A cobranca recorrente sera encerrada e a conta voltara imediatamente ao Plano Gratis. O cancelamento comum nao gera reembolso automatico, sem prejuizo dos direitos previstos em lei.",
    );
    if (!confirmed) return;

    setPending(true);
    try {
      const result = await cancelCurrentPlanAction();
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Cancelamento nao concluido",
          description: result.error,
        });
        return;
      }

      toast({
        variant: "success",
        title: "Assinatura cancelada",
        description: "A conta voltou ao Plano Gratis.",
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={cancelPlan}
      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      {pending ? "Cancelando..." : "Cancelar assinatura"}
    </Button>
  );
}
