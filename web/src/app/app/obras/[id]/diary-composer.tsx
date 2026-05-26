"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createDiaryEntryAction } from "./actions";

interface DiaryComposerProps {
  projectId: string;
}

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  attempt: number;
  storage_path?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  errorMessage?: string;
}

const MAX_PHOTOS = 20;
const STORAGE_KEY = (id: string) => `diary-draft-${id}`;

export function DiaryComposer({ projectId }: DiaryComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [posting, startPost] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recupera rascunho do body do sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY(projectId));
      if (saved) setBody(saved);
    } catch {
      // ignore
    }
  }, [projectId]);

  // Persiste rascunho do body
  useEffect(() => {
    try {
      if (body) sessionStorage.setItem(STORAGE_KEY(projectId), body);
      else sessionStorage.removeItem(STORAGE_KEY(projectId));
    } catch {
      // ignore
    }
  }, [body, projectId]);

  // Limpa previewUrls ao desmontar
  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadOne(photo: PendingPhoto) {
    const fd = new FormData();
    fd.append("project_id", projectId);
    fd.append("file", photo.file);

    const maxAttempts = 3;
    let attempt = photo.attempt;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const res = await fetch("/api/diary/upload", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          let msg = "Falha no upload.";
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            // body não-JSON
          }
          // 4xx não tenta de novo (formato, tamanho, auth)
          if (res.status >= 400 && res.status < 500) {
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === photo.id
                  ? { ...p, status: "error", attempt, errorMessage: msg }
                  : p,
              ),
            );
            return;
          }
          throw new Error(msg);
        }
        const data = (await res.json()) as {
          storage_path: string;
          width: number;
          height: number;
          size_bytes: number;
        };
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  status: "done",
                  attempt,
                  storage_path: data.storage_path,
                  width: data.width,
                  height: data.height,
                  size_bytes: data.size_bytes,
                }
              : p,
          ),
        );
        return;
      } catch {
        if (attempt >= maxAttempts) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? {
                    ...p,
                    status: "error",
                    attempt,
                    errorMessage: "Sem internet. Tente de novo.",
                  }
                : p,
            ),
          );
          return;
        }
        // backoff 1s/2s
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const available = MAX_PHOTOS - photos.length;
    if (files.length > available) {
      setError(`Máximo ${MAX_PHOTOS} fotos por entrada. Adicionei só ${available}.`);
    }
    const accepted = Array.from(files).slice(0, available);

    const newOnes: PendingPhoto[] = accepted.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "uploading",
      attempt: 0,
    }));

    setPhotos((prev) => [...prev, ...newOnes]);
    // Upload em paralelo
    for (const p of newOnes) {
      void uploadOne(p);
    }

    // Limpa input pra permitir re-selecionar mesmo arquivo
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  function retryPhoto(id: string) {
    const p = photos.find((x) => x.id === id);
    if (!p) return;
    setPhotos((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, status: "uploading", errorMessage: undefined } : x,
      ),
    );
    void uploadOne({ ...p, attempt: 0 });
  }

  const uploadingCount = photos.filter((p) => p.status === "uploading").length;
  const errorCount = photos.filter((p) => p.status === "error").length;
  const donePhotos = photos.filter((p) => p.status === "done");
  const canPost =
    !posting &&
    uploadingCount === 0 &&
    errorCount === 0 &&
    (body.trim().length > 0 || donePhotos.length > 0);

  function submit() {
    setError(null);
    startPost(async () => {
      const payload = donePhotos.map((p, idx) => ({
        storage_path: p.storage_path!,
        width: p.width ?? null,
        height: p.height ?? null,
        size_bytes: p.size_bytes!,
        position: idx,
      }));
      const r = await createDiaryEntryAction(projectId, body.trim(), payload);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // Cleanup
      for (const p of photos) URL.revokeObjectURL(p.previewUrl);
      setPhotos([]);
      setBody("");
      try {
        sessionStorage.removeItem(STORAGE_KEY(projectId));
      } catch {
        // ignore
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="O que rolou hoje? (opcional)"
        rows={2}
        maxLength={2000}
        disabled={posting}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              {p.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
              {p.status === "error" && (
                <button
                  type="button"
                  onClick={() => retryPhoto(p.id)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 text-[10px] font-semibold text-destructive-foreground"
                  title={p.errorMessage}
                >
                  Tentar
                  <br />
                  de novo
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                disabled={posting}
                aria-label="Remover foto"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          capture="environment"
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={posting || photos.length >= MAX_PHOTOS}
        >
          <Camera className="h-4 w-4" />
          Adicionar foto
          {photos.length > 0 && ` (${photos.length}/${MAX_PHOTOS})`}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {uploadingCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Enviando {uploadingCount}…
            </span>
          )}
          <Button onClick={submit} disabled={!canPost} size="sm">
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Postar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
