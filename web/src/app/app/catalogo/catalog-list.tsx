"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  ListEmptyState,
  ListToolbar,
} from "@/components/app-shell/list-toolbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";
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
    const normalizedQuery = normalizeSearch(query);
    return items.filter(
      (item) =>
        normalizeSearch(item.description).includes(normalizedQuery) ||
        normalizeSearch(item.unit).includes(normalizedQuery),
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
      <ListToolbar
        ariaLabel="Busca e ações do catálogo"
        search={{
          value: query,
          onValueChange: setQuery,
          name: "catalog-search",
          label: "Buscar itens do catálogo",
          placeholder: "Buscar item do catálogo…",
        }}
        actions={
          <>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Novo item
            </Button>
            <CatalogImportDialog currentPlan={currentPlan} />
          </>
        }
        summary={
          <p>
            {filtered.length === items.length
              ? `${items.length} ${items.length === 1 ? "item" : "itens"} no catálogo`
              : `${filtered.length} de ${items.length}`}
          </p>
        }
      />

      {filtered.length === 0 ? (
        <ListEmptyState
          title="Nenhum item encontrado"
          description={`Não encontramos item para “${query.trim()}”.`}
          actionLabel="Limpar busca"
          onAction={() => setQuery("")}
        />
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
                    <Pencil aria-hidden="true" className="h-4 w-4" />
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
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
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
