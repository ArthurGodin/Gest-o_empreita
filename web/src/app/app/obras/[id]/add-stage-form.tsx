"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addStageAction } from "./actions";

interface AddStageFormProps {
  projectId: string;
}

export function AddStageForm({ projectId }: AddStageFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Digite o nome da etapa.");
      return;
    }
    const estDays = days === "" ? null : Number.parseInt(days, 10);
    if (estDays !== null && (Number.isNaN(estDays) || estDays < 1)) {
      setError("Dias previstos inválidos.");
      return;
    }
    startTransition(async () => {
      const r = await addStageAction(projectId, trimmed, estDays);
      if (!r.ok) {
        setError(r.error);
      } else {
        setName("");
        setDays("");
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Adicionar etapa
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-3">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da etapa (ex: Pintura)"
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <Input
        type="number"
        min={1}
        max={365}
        value={days}
        onChange={(e) => setDays(e.target.value)}
        placeholder="Dias previstos (opcional)"
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      {error && (
        <div className="text-xs text-destructive">{error}</div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Adicionar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
