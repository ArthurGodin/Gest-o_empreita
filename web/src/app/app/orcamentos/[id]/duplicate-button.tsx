"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateQuoteAction } from "../actions";

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
        return;
      }
      router.push(`/app/orcamentos/${result.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={onClick} disabled={pending}>
        {intent === "revision" ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {pending
          ? intent === "revision"
            ? "Criando..."
            : "Duplicando..."
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
