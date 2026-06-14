"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlayCircle,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { trackProductEvent } from "@/lib/product-analytics";
import { prepareDemoKitAction, type DemoKitResult } from "./actions";

type DemoKitSuccess = Extract<DemoKitResult, { ok: true }>;

export function DemoKitButton() {
  const [isPending, startTransition] = React.useTransition();
  const [demo, setDemo] = React.useState<DemoKitSuccess | null>(null);

  function prepareDemo() {
    startTransition(async () => {
      const result = await prepareDemoKitAction();

      if (!result.ok) {
        toast({
          title: "Não consegui preparar a demo",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setDemo(result);
      trackProductEvent("demo_kit_prepared", {
        reused: result.reused,
        quoteId: result.quoteId,
        projectId: result.projectId,
      });
      toast({
        title: result.reused ? "Demo atualizada" : "Demo criada",
        description:
          "Cliente, orçamento aprovado, obra, custos e cobranças locais estão prontos para apresentar.",
        variant: "success",
      });
    });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        onClick={prepareDemo}
        disabled={isPending}
        className="h-12 w-full justify-center sm:w-auto"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PlayCircle className="h-4 w-4" />
        )}
        {isPending ? "Preparando demo…" : "Preparar demo vendável"}
      </Button>

      {demo ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-50">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-bold">
                Demo pronta para abrir no roteiro comercial.
              </div>
              <div className="mt-1 text-emerald-900/80 dark:text-emerald-100/80">
                Use os links abaixo para navegar sem procurar dados no painel.
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button asChild variant="outline" size="sm">
              <Link href={demo.quoteUrl}>
                <Presentation className="h-4 w-4" />
                Orçamento
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={demo.projectUrl}>
                <CheckCircle2 className="h-4 w-4" />
                Obra
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={demo.publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Link cliente
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
