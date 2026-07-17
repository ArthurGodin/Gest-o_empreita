"use client";

import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";

export function ProtectedDraftNavigation({ dirty }: { dirty: boolean }) {
  return (
    <ProtectedFormNavigation
      dirty={dirty}
      contentLabel="neste orçamento"
      confirmMessage="Este orçamento tem alterações não salvas. Deseja sair sem salvar?"
    />
  );
}
