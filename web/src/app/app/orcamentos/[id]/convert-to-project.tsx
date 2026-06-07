"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/utils";
import { convertToProjectAction } from "../actions";

export interface TemplateOption {
  id: string;
  name: string;
  is_system: boolean;
}

interface ConvertToProjectProps {
  quoteId: string;
  quoteTitle: string;
  quoteTotalCents: number;
  customerDocument?: string | null;
  templates: TemplateOption[];
}

const NO_TEMPLATE = "__none__";

export function ConvertToProject({
  quoteId,
  quoteTitle,
  quoteTotalCents,
  customerDocument,
  templates,
}: ConvertToProjectProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default: primeiro template system (Cobertura nova, se seed rodou)
  const defaultTemplate =
    templates.find((t) => t.is_system)?.id ?? NO_TEMPLATE;
  const [templateId, setTemplateId] = useState(defaultTemplate);
  const [entryPct, setEntryPct] = useState("30");
  const [cpfCnpj, setCpfCnpj] = useState(customerDocument ?? "");

  const parsedEntryPct = Number(entryPct.replace(",", "."));
  const entryCents = Number.isFinite(parsedEntryPct)
    ? Math.round((quoteTotalCents * parsedEntryPct) / 100)
    : 0;
  const saldoCents = Math.max(quoteTotalCents - entryCents, 0);

  function onConfirm() {
    setError(null);
    const tpl = templateId === NO_TEMPLATE ? null : templateId;
    if (!Number.isFinite(parsedEntryPct) || parsedEntryPct < 0 || parsedEntryPct > 100) {
      setError("Entrada deve ficar entre 0% e 100%.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await convertToProjectAction(quoteId, {
          templateId: tpl,
          entryPct: parsedEntryPct,
          cpfCnpj: cpfCnpj.trim(),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/app/obras/${result.project_id}`);
        router.refresh();
      } catch (e) {
        console.error("[convert] action threw:", e);
        setError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <HardHat className="h-4 w-4" />
        Virar obra
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Virar essa obra?</DialogTitle>
            <DialogDescription>
              Vamos criar uma obra a partir do orçamento{" "}
              <strong>{quoteTitle}</strong>. Cliente, endereço e valor previsto
              já vêm preenchidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label
              htmlFor="template-select"
              className="text-sm font-medium text-foreground"
            >
              Etapas pré-prontas?
            </Label>
            <select
              id="template-select"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={NO_TEMPLATE}>
                Criar sem etapas (vou adicionar manualmente)
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.is_system ? "Modelo: " : "Meu: "}
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Você pode editar, adicionar ou apagar etapas depois.
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entry-pct">Entrada agora (%)</Label>
              <Input
                id="entry-pct"
                inputMode="decimal"
                value={entryPct}
                onChange={(e) => setEntryPct(e.target.value)}
                disabled={pending}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Entrada: {formatBRL(entryCents / 100)} · Saldo:{" "}
                {formatBRL(saldoCents / 100)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf-cnpj">CPF/CNPJ do cliente</Label>
              <Input
                id="cpf-cnpj"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                disabled={pending}
                placeholder="Somente números"
              />
              <p className="text-xs text-muted-foreground">
                Necessário para emitir a cobrança Pix no Asaas.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? "Criando obra..." : "Confirmar e criar obra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
