"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";
import type { DiaryEntry } from "@/lib/queries/projects";
import { deleteDiaryEntryAction } from "./actions";

function formatTimeBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function DiaryEntryView({ entry }: { entry: DiaryEntry }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const photos = [...entry.photos].sort((a, b) => a.position - b.position);

  // Esc fecha lightbox + setas navegam
  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft")
        setLightboxIdx((i) => (i === null ? null : Math.max(0, i - 1)));
      if (e.key === "ArrowRight")
        setLightboxIdx((i) =>
          i === null ? null : Math.min(photos.length - 1, i + 1),
        );
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, photos.length]);

  function doDelete() {
    setError(null);
    startTransition(async () => {
      const r = await deleteDiaryEntryAction(entry.id);
      if (!r.ok) {
        setError(r.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <article className="border-b py-4 last:border-0 last:pb-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          {formatDateBR(entry.created_at)} · {formatTimeBR(entry.created_at)}
        </div>
        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            className="h-11 w-11"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Mais opções"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
          {menuOpen && (
            <div
              className="absolute right-0 top-11 z-10 w-40 rounded-md border bg-popover p-1 text-sm shadow-md"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {!confirming ? (
                <button
                  type="button"
                  className="flex min-h-10 w-full items-center gap-2 rounded px-2 py-1.5 text-left text-destructive hover:bg-muted"
                  onClick={() => setConfirming(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Apagar entrada
                </button>
              ) : (
                <div className="space-y-1 p-1">
                  <div className="text-xs">Tem certeza?</div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={doDelete}
                      disabled={pending}
                      className="h-10 flex-1 text-xs"
                    >
                      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apagar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setConfirming(false);
                        setMenuOpen(false);
                      }}
                      className="h-10 flex-1 text-xs"
                    >
                      Não
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {entry.body && (
        <p className="mb-2 whitespace-pre-wrap text-sm">{entry.body}</p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxIdx(idx)}
              className="aspect-square overflow-hidden rounded-md bg-muted hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/diary/photo/${photo.id}`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4 text-white hover:bg-white/10"
            onClick={() => setLightboxIdx(null)}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/diary/photo/${photos[lightboxIdx].id}`}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxIdx + 1} / {photos.length} · ← → pra navegar
            </div>
          )}
        </div>
      )}
    </article>
  );
}
