"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "./item-dialog";
import { CatalogImportDialog } from "./catalog-import-dialog";

/**
 * Botão que abre o dialog de criar item, usado no empty state.
 * Separado em arquivo próprio porque o EmptyState está em Server Component.
 */
export function CreateFirstItem({ currentPlan }: { currentPlan: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col justify-center gap-2 sm:flex-row">
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Cadastrar primeiro item
      </Button>
      <CatalogImportDialog
        currentPlan={currentPlan}
        buttonClassName="h-12 px-6 text-base"
      />
      {open && <ItemDialog open={open} onOpenChange={setOpen} />}
    </div>
  );
}
