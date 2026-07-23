"use client";

import { BookOpen } from "lucide-react";
import type { DiaryEntry } from "@/lib/queries/projects";
import { useBusinessVocabulary } from "@/components/business-segment-context";
import { DiaryComposer } from "./diary-composer";
import { DiaryEntryView } from "./diary-entry";

interface DiarySectionProps {
  projectId: string;
  entries: DiaryEntry[];
  total: number;
}

export function DiarySection({ projectId, entries, total }: DiarySectionProps) {
  const vocabulary = useBusinessVocabulary();

  return (
    <section className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold text-foreground">
            {vocabulary.diaryLabel}
          </div>
        </div>
        {total > 0 && (
          <div className="text-xs text-muted-foreground">
            {total} entrada{total === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <DiaryComposer projectId={projectId} />

      <div className="mt-2">
        {entries.length === 0 ? (
          <div className="rounded-md bg-muted/20 px-3 py-5 text-center text-sm text-muted-foreground">
            Nenhum registro ainda. Adicione a primeira atualização{" "}
            {vocabulary.projectSingular === "Projeto" ? "do projeto" : "da obra"}.
          </div>
        ) : (
          <div>
            {entries.map((e) => (
              <DiaryEntryView key={e.id} entry={e} />
            ))}
          </div>
        )}
        {entries.length > 0 && total > entries.length && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            Mostrando {entries.length} de {total} entradas
          </div>
        )}
      </div>
    </section>
  );
}
