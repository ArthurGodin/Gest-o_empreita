"use client";

import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { useBusinessVocabulary } from "@/components/business-segment-context";

export function ProtectedDraftNavigation({ dirty }: { dirty: boolean }) {
  const vocabulary = useBusinessVocabulary();
  const quoteLabel =
    vocabulary.quoteSingular === "Proposta"
      ? "nesta proposta"
      : "neste orçamento";

  return (
    <ProtectedFormNavigation
      dirty={dirty}
      contentLabel={quoteLabel}
      confirmMessage={`${vocabulary.quoteSingular === "Proposta" ? "Esta proposta" : "Este orçamento"} tem alterações não salvas. Deseja sair sem salvar?`}
    />
  );
}
