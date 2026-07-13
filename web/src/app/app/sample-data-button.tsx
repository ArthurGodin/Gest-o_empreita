"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { trackProductEvent } from "@/lib/product-analytics";
import { prepareDemoKitAction } from "./configuracoes/diagnostico/actions";

export function SampleDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function prepareSampleData() {
    startTransition(async () => {
      const result = await prepareDemoKitAction();

      if (!result.ok) {
        toast({
          title: "Não foi possível criar os dados de exemplo",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      trackProductEvent("demo_kit_prepared", {
        source: "dashboard_empty_state",
        reused: result.reused,
      });

      toast({
        title: result.reused ? "Exemplo atualizado" : "Exemplo criado",
        description:
          "Criamos um cliente, orçamento aprovado, obra, custos e cobranças locais para você explorar.",
        variant: "success",
      });

      router.refresh();
      router.push(result.quoteUrl);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={prepareSampleData}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      {pending ? "Criando exemplo..." : "Explorar com exemplo"}
    </Button>
  );
}
