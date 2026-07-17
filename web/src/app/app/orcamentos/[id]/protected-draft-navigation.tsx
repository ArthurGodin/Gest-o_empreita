"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UNSAVED_MESSAGE =
  "Este orçamento tem alterações não salvas. Deseja sair sem salvar?";

export function ProtectedDraftNavigation({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const bypassRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function onDocumentClick(event: globalThis.MouseEvent) {
      if (
        bypassRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      const sameDocument =
        destination.pathname === current.pathname &&
        destination.search === current.search;
      if (sameDocument) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
    }

    function onPopState() {
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false;
        return;
      }
      if (bypassRef.current) return;
      if (window.confirm(UNSAVED_MESSAGE)) {
        bypassRef.current = true;
        return;
      }

      restoringHistoryRef.current = true;
      window.history.forward();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [dirty]);

  function continueEditing() {
    setPendingHref(null);
  }

  function leaveWithoutSaving() {
    if (!pendingHref) return;
    const destination = pendingHref;
    bypassRef.current = true;
    setPendingHref(null);
    router.push(destination);
    window.setTimeout(() => {
      bypassRef.current = false;
    }, 1_000);
  }

  return (
    <Dialog
      open={Boolean(pendingHref)}
      onOpenChange={(open) => {
        if (!open) continueEditing();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-800">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle>Alterações ainda não foram salvas</DialogTitle>
          <DialogDescription>
            Se você sair agora, as mudanças feitas neste orçamento serão
            perdidas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={continueEditing}>
            Continuar editando
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={leaveWithoutSaving}
          >
            Sair sem salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
