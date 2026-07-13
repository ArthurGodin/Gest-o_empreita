"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTemplateAction,
  updateTemplateAction,
} from "./actions";

interface ItemDraft {
  name: string;
  est_days: string;
}

interface TemplateFormProps {
  templateId?: string;
  initialName?: string;
  initialDescription?: string;
  initialItems?: Array<{ name: string; est_days: number | null }>;
  onSaved: () => void;
  onCancel: () => void;
}

export function TemplateForm({
  templateId,
  initialName = "",
  initialDescription = "",
  initialItems = [{ name: "", est_days: null }],
  onSaved,
  onCancel,
}: TemplateFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [items, setItems] = useState<ItemDraft[]>(
    initialItems.map((i) => ({
      name: i.name,
      est_days: i.est_days?.toString() ?? "",
    })),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    setItems((prev) => [...prev, { name: "", est_days: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }

  function move(idx: number, dir: "up" | "down") {
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= items.length) return;
    setItems((prev) => {
      const cp = [...prev];
      const a = cp[idx];
      const b = cp[swap];
      if (!a || !b) return prev;
      cp[idx] = b;
      cp[swap] = a;
      return cp;
    });
  }

  function submit() {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError("Nome do template é obrigatório.");
      return;
    }
    const validItems: Array<{ name: string; est_days: number | null }> = [];
    for (const it of items) {
      const n = it.name.trim();
      if (n.length === 0) continue;
      const days = it.est_days === "" ? null : Number.parseInt(it.est_days, 10);
      if (days !== null && (Number.isNaN(days) || days < 1)) {
        setError(`Dias previstos inválidos em "${n}".`);
        return;
      }
      validItems.push({ name: n, est_days: days });
    }
    if (validItems.length === 0) {
      setError("Adicione pelo menos uma etapa.");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: trimmedName,
        description: description.trim(),
        items: validItems,
      };
      const r = templateId
        ? await updateTemplateAction(templateId, payload)
        : await createTemplateAction(payload);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
      onSaved();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
      <div className="space-y-1.5">
        <Label htmlFor="template-name">Nome do template</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Telhado industrial"
          maxLength={100}
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="template-description">
          Descrição <span className="text-xs text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Pra que tipo de obra serve"
          maxLength={500}
          rows={2}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Etapas (em ordem)</div>
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li
              key={idx}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-background p-2 sm:grid-cols-[auto_minmax(0,1fr)_6rem_auto]"
            >
              <div className="row-span-2 flex flex-col sm:row-span-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10"
                  onClick={() => move(idx, "up")}
                  disabled={pending || idx === 0}
                  aria-label={`Mover etapa ${idx + 1} para cima`}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10"
                  onClick={() => move(idx, "down")}
                  disabled={pending || idx === items.length - 1}
                  aria-label={`Mover etapa ${idx + 1} para baixo`}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <Input
                aria-label={`Nome da etapa ${idx + 1}`}
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                placeholder="Ex: Remoção do telhado antigo"
                disabled={pending}
                className="flex-1"
              />
              <Input
                aria-label={`Dias previstos da etapa ${idx + 1}`}
                type="number"
                min={1}
                max={365}
                value={it.est_days}
                onChange={(e) => updateItem(idx, { est_days: e.target.value })}
                placeholder="dias"
                disabled={pending}
                className="col-start-2 w-full sm:col-start-auto"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="row-span-2 h-10 w-10 text-muted-foreground hover:text-destructive sm:row-span-1"
                onClick={() => removeItem(idx)}
                disabled={pending || items.length <= 1}
                aria-label="Remover etapa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={pending}
        >
          <Plus className="h-4 w-4" />
          Adicionar etapa
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
