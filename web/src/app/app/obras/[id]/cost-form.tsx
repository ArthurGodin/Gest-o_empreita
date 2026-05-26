"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CostCategory } from "@/lib/supabase/types";
import type { ProjectStage } from "@/lib/queries/projects";
import { todayBR } from "@/lib/dates";
import { addCostAction } from "./actions";

const CATEGORY_OPTIONS: { value: CostCategory; label: string }[] = [
  { value: "material", label: "Material" },
  { value: "labor", label: "MO (Mão de obra)" },
  { value: "freight", label: "Frete" },
  { value: "other", label: "Outros" },
];

function parseBRLToCents(input: string): number | null {
  // Aceita "1.234,56" ou "1234,56" ou "1234.56" ou "1234"
  const cleaned = input.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

interface CostFormProps {
  projectId: string;
  stages: ProjectStage[];
}

export function CostForm({ projectId, stages }: CostFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CostCategory>("material");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [incurredOn, setIncurredOn] = useState(todayBR());
  const inProgressStage = stages.find((s) => s.status === "in_progress");
  const [stageId, setStageId] = useState<string>(
    inProgressStage?.id ?? "__none__",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const trimmedDesc = description.trim();
    if (trimmedDesc.length === 0) {
      setError("Digite uma descrição.");
      return;
    }
    const cents = parseBRLToCents(amountStr);
    if (cents === null || cents <= 0) {
      setError("Valor inválido. Use vírgula pra centavos (ex: 1.234,56).");
      return;
    }

    startTransition(async () => {
      const r = await addCostAction(projectId, {
        category,
        description: trimmedDesc,
        amount_cents: cents,
        stage_id: stageId === "__none__" ? null : stageId,
        incurred_on: incurredOn,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // reset
      setDescription("");
      setAmountStr("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Lançar gasto
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar gasto</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CostCategory)}
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Telha cerâmica 12x"
              maxLength={200}
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="1.234,56"
                inputMode="decimal"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={incurredOn}
                onChange={(e) => setIncurredOn(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          {stages.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Vincular a etapa (opcional)
              </label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                disabled={pending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="__none__">Sem vínculo</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.status === "in_progress" ? "▶ " : ""}
                    {s.name}
                  </option>
                ))}
              </select>
              {inProgressStage && stageId === "__none__" && (
                <button
                  type="button"
                  onClick={() => setStageId(inProgressStage.id)}
                  className="text-xs text-primary hover:underline"
                >
                  Vincular à etapa em execução ({inProgressStage.name})?
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lançar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
