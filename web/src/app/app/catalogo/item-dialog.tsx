"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
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
import { centsToBRLInput, normalizeQuoteUnit, parseBRLToCents } from "@/lib/format";
import {
  createCatalogItemAction,
  updateCatalogItemAction,
} from "./actions";
import type { CatalogItem } from "@/lib/queries/catalog";

interface ItemDialogProps {
  /** Quando definido, modo edição. Sem isso, modo criação. */
  item?: CatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMON_UNITS = ["un", "m²", "m", "kg", "h", "dia", "saco"];

export function ItemDialog({ item, open, onOpenChange }: ItemDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(item);

  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "un");
  const [priceInput, setPriceInput] = useState(
    item ? centsToBRLInput(item.default_price_cents) : "0,00",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cents = parseBRLToCents(priceInput);
    if (cents == null) {
      setError("Preço inválido. Use formato como 8,00 ou R$ 8,00.");
      return;
    }

    startTransition(async () => {
      const payload = {
        description: description.trim(),
        unit: unit.trim() || "un",
        default_price_cents: cents,
      };

      const result = isEdit
        ? await updateCatalogItemAction(item!.id, payload)
        : await createCatalogItemAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar item" : "Novo item do catálogo"}</DialogTitle>
          <DialogDescription>
            Itens cadastrados aqui aparecem no autocomplete quando você monta um
            orçamento. Bom pra coisas que você usa muito (telha, mão de obra, etc.).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              required
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Telha cerâmica romana"
            />
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                onBlur={() => setUnit(normalizeQuoteUnit(unit))}
                list="common-units"
                placeholder="un"
              />
              <datalist id="common-units">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <Save className="h-4 w-4" />
              {pending ? "Salvando…" : isEdit ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
