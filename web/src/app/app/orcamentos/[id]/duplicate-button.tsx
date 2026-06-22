"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { duplicateQuoteAction } from "../actions/duplicate";

export function DuplicateButton({
  id,
  label = "Duplicar",
  intent = "copy",
}: {
  id: string;
  label?: string;
  intent?: "copy" | "revision";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateQuoteAction(id, { intent });
      if (!result.ok) {
        setError(result.error);
        toast({
          variant: "destructive",
          title:
            intent === "revision"
              ? "Não foi possível criar revisão"
              : "Não foi possível duplicar",
          description: result.error,
        });
        return;
      }
      toast({
        variant: "success",
        title: intent === "revision" ? "Revisão criada" : "Orçamento duplicado",
        description:
          intent === "revision"
            ? "Ajuste o rascunho e envie novamente para o cliente."
            : "O novo rascunho já está pronto para edição.",
      });
      const nextUrl =
        intent === "revision"
          ? `/app/orcamentos/${result.id}?revisao=${id}`
          : `/app/orcamentos/${result.id}`;
      router.push(nextUrl);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={intent === "revision" ? "default" : "outline"}
        onClick={onClick}
        disabled={pending}
        className={
          intent === "revision"
            ? "bg-amber-600 text-white hover:bg-amber-700"
            : undefined
        }
      >
        {intent === "revision" ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {pending
          ? intent === "revision"
            ? "Criando…"
            : "Duplicando…"
          : label}
      </Button>
      {error && (
        <div className="absolute mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </>
  );
}
