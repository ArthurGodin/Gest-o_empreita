"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDiscardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  contentLabel: string;
}

export function ConfirmDiscardDialog({
  open,
  onOpenChange,
  onConfirm,
  contentLabel,
}: ConfirmDiscardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-5 p-5">
        <DialogHeader className="pr-6 text-left">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 text-amber-800">
            <TriangleAlert aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base">Descartar alterações?</DialogTitle>
          <DialogDescription>
            As alterações {contentLabel} ainda não foram salvas. Esta ação não
            pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => onOpenChange(false)}
          >
            Continuar editando
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11"
            onClick={onConfirm}
          >
            Descartar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
