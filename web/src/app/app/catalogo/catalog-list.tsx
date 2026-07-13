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
import { CatalogImportDialog } from "./catalog-import-dialog";
import { deleteCatalogItemAction } from "./actions";
import type { CatalogItem } from "@/lib/queries/catalog";

interface CatalogListProps {
  items: CatalogItem[];
  currentPlan: string;
}

export function CatalogList({ items, currentPlan }: CatalogListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.unit.toLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);

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
      } catch (error) {
        console.error("[catalog-delete] action threw:", error);
        setDeleteError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <section
        aria-label="Busca e ações do catálogo"
        className="rounded-lg border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              name="catalog-search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar item do catálogo…"
              aria-label="Buscar itens do catálogo"
              className="pl-9 pr-11"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Novo item
            </Button>
            <CatalogImportDialog currentPlan={currentPlan} />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {filtered.length === items.length
            ? `${items.length} ${items.length === 1 ? "item" : "itens"} no catálogo`
            : `${filtered.length} de ${items.length}`}
        </p>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum item encontrado para “{query}”.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
          <div className="hidden grid-cols-[minmax(0,1fr)_10rem_9rem_6.5rem] gap-4 border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
            <span>Item</span>
            <span>Preço padrão</span>
            <span>Uso</span>
            <span className="text-center">Ações</span>
          </div>
          <ul className="divide-y">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="grid min-h-[104px] grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3.5 md:min-h-16 md:grid-cols-[minmax(0,1fr)_10rem_9rem_6.5rem] md:items-center md:gap-4 md:py-3"
              >
                <span
                  title={item.description}
                  className="col-span-2 min-w-0 truncate text-sm font-semibold text-slate-950 md:col-span-1"
                >
                  {item.description}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-800">
                  {formatBRL(item.default_price_cents / 100)}
                  <span className="ml-1 font-normal text-muted-foreground">
                    / {item.unit}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground md:text-sm">
                  {item.usage_count > 0
                    ? `${item.usage_count} ${item.usage_count === 1 ? "orçamento" : "orçamentos"}`
                    : "Ainda não usado"}
                </span>
                <span className="col-start-2 row-span-2 row-start-2 flex items-center justify-end md:col-start-4 md:row-span-1 md:row-start-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(item)}
                    aria-label={`Editar ${item.description}`}
                    title="Editar item"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                    onClick={() => setDeleting(item)}
                    aria-label={`Apagar ${item.description}`}
                    title="Apagar item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {creating ? (
        <ItemDialog open={creating} onOpenChange={setCreating} />
      ) : null}

      {editing ? (
        <ItemDialog
          item={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar item do catálogo?</DialogTitle>
            <DialogDescription>
              Você está prestes a apagar{" "}
              <span className="font-medium text-foreground">
                {deleting?.description}
              </span>
              . Orçamentos antigos continuam como estão; somente o autocomplete
              deixará de sugerir este item.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {deleteError}
            </div>
          ) : null}
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
              {deletePending ? "Apagando…" : "Sim, apagar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
