"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/utils";
import { ItemDialog } from "./item-dialog";
import { deleteCatalogItemAction } from "./actions";
import type { CatalogItem } from "@/lib/queries/catalog";

interface CatalogListProps {
  items: CatalogItem[];
}

export function CatalogList({ items }: CatalogListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.description.toLowerCase().includes(q) ||
        it.unit.toLowerCase().includes(q),
    );
  }, [items, query]);

  function updateQuery(value: string) {
    setQuery(value);
  }

  function onConfirmDelete() {
    if (!deleting) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        const result = await deleteCatalogItemAction(deleting.id);
        if (!result.ok) {
          setDeleteError(result.error ?? "Não foi possível apagar.");
          return;
        }
        setDeleting(null);
        router.refresh();
      } catch (e) {
        console.error("[catalog-delete] action threw:", e);
        setDeleteError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            onInput={(e) => updateQuery(e.currentTarget.value)}
            placeholder="Buscar item do catálogo..."
            className="pl-9 pr-9"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => updateQuery("")}
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Novo item
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length === items.length
          ? `${items.length} ${items.length === 1 ? "item" : "itens"} no catálogo`
          : `${filtered.length} de ${items.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card py-10 text-center text-sm text-muted-foreground">
          {query
            ? `Nenhum item bate com "${query}".`
            : "Catálogo vazio. Clique em 'Novo item' pra começar."}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{item.description}</div>
                <div className="text-sm text-muted-foreground">
                  {formatBRL(item.default_price_cents / 100)} por {item.unit}
                  {item.usage_count > 0 && (
                    <span> · usado {item.usage_count}× em orçamentos</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(item)}
                  aria-label={`Editar ${item.description}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(item)}
                  aria-label={`Apagar ${item.description}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog de criar */}
      {creating && (
        <ItemDialog open={creating} onOpenChange={setCreating} />
      )}

      {/* Dialog de editar */}
      {editing && (
        <ItemDialog
          item={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}

      {/* Dialog de confirmar delete */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar item do catálogo?</DialogTitle>
            <DialogDescription>
              Você está prestes a apagar{" "}
              <span className="font-medium text-foreground">{deleting?.description}</span>.
              Orçamentos antigos que usaram este item continuam como estão (a descrição
              foi copiada na hora). Só o autocomplete não vai mais sugerir.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={deletePending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={deletePending}
            >
              {deletePending ? "Apagando..." : "Sim, apagar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
