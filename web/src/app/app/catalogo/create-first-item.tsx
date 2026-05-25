"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "./item-dialog";

/**
 * Botão que abre o dialog de criar item, usado no empty state.
 * Separado em arquivo próprio porque o EmptyState está em Server Component.
 */
export function CreateFirstItem() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Cadastrar primeiro item
      </Button>
      {open && <ItemDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
