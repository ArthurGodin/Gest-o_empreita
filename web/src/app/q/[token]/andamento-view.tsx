"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MapPin,
  Pause,
  X,
} from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { PROJECT_STATUS_LABEL } from "@/lib/project-status";
import {
  getBusinessVocabulary,
  isProfessionalSegment,
  type BusinessSegment,
} from "@/lib/business-segment";
import type {
  ChargeKind,
  ChargeStatus,
  ProjectStatus,
  StageStatus,
} from "@/lib/supabase/types";

export interface PublicBillingCharge {
  kind: ChargeKind;
  status: ChargeStatus;
  amount_cents: number;
  payment_provider: "asaas" | "manual_pix";
  pix_qr_code: string | null;
  pix_qr_image_b64: string | null;
  invoice_url: string | null;
  due_date: string | null;
  paid_at: string | null;
  released_at: string | null;
}

export interface PublicProjectView {
  name: string;
  status: ProjectStatus;
  starts_on: string | null;
  city: string | null;
  state: string | null;
  progress_pct: number | null;
  last_diary_at: string | null;
  delivery_approved_at: string | null;
  delivery_acceptance: {
    signer_name: string;
    accepted_at: string;
  } | null;
  charges: PublicBillingCharge[];
  stages: Array<{
    position: number;
    name: string;
    status: StageStatus;
    est_days: number | null;
    started_on: string | null;
    completed_on: string | null;
  }>;
  diary: Array<{
    body: string;
    created_at: string;
    photos: Array<{ id: string; position: number }>;
  }>;
  diary_total: number;
}

interface AndamentoViewProps {
  view: PublicProjectView;
  shareToken: string;
  businessSegment: BusinessSegment;
}

const STATUS_PILL: Record<ProjectStatus, string> = {
  planning: "bg-muted text-muted-foreground",
  in_progress:
    "bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  paused:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  completed:
    "bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200",
};

const STAGE_PILL: Record<StageStatus, { label: string; class: string }> = {
  todo: { label: "A fazer", class: "bg-muted text-muted-foreground" },
  in_progress: {
    label: "Em execução",
    class: "bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  },
  done: {
    label: "Feito",
    class: "bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  },
};

export function AndamentoView({
  view,
  shareToken,
  businessSegment,
}: AndamentoViewProps) {
  const vocabulary = getBusinessVocabulary(businessSegment);
  const isProfessional = isProfessionalSegment(businessSegment);
  const statusLabel = isProfessional
    ? {
        planning: "Planejado",
        in_progress: "Em execução",
        paused: "Pausado",
        completed: "Concluído",
        cancelled: "Cancelado",
      }[view.status]
    : PROJECT_STATUS_LABEL[view.status];
  const diaryLabel = vocabulary.diaryLabel;
  const stages = [...view.stages].sort((a, b) => a.position - b.position);
  const doneCount = stages.filter((s) => s.status === "done").length;
  const totalCount = stages.length;
  const pct = view.progress_pct ?? (totalCount === 0 ? 0 : (doneCount / totalCount) * 100);

  const [lightboxIdx, setLightboxIdx] = useState<{ entry: number; photo: number } | null>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIdx(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx]);

  const allPhotos: Array<{
    entryIdx: number;
    photoIdx: number;
    photoId: string;
  }> = [];
  view.diary.forEach((entry, ei) => {
    entry.photos.forEach((p, pi) => {
      allPhotos.push({ entryIdx: ei, photoIdx: pi, photoId: p.id });
    });
  });

  function openLightbox(entryIdx: number, photoIdx: number) {
    setLightboxIdx({ entry: entryIdx, photo: photoIdx });
  }
  function flatLightboxIdx(): number {
    if (!lightboxIdx) return -1;
    return allPhotos.findIndex(
      (p) => p.entryIdx === lightboxIdx.entry && p.photoIdx === lightboxIdx.photo,
    );
  }
  function navLightbox(dir: 1 | -1) {
    const cur = flatLightboxIdx();
    if (cur === -1) return;
    const next = cur + dir;
    if (next < 0 || next >= allPhotos.length) return;
    const target = allPhotos[next];
    if (target) {
      setLightboxIdx({ entry: target.entryIdx, photo: target.photoIdx });
    }
  }

  const currentPhotoId =
    lightboxIdx !== null
      ? view.diary[lightboxIdx.entry]?.photos[lightboxIdx.photo]?.id
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {view.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(view.city || view.state) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[view.city, view.state].filter(Boolean).join("/")}
              </span>
            )}
            {view.starts_on && (
              <span>
                {isProfessional ? "Iniciado" : "Iniciada"}{" "}
                {formatDateBR(view.starts_on)}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[view.status]}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {totalCount > 0 && (
          <>
            <div className="mt-4 text-sm">
              <strong>
                {doneCount} de {totalCount} etapa{totalCount > 1 ? "s" : ""} concluída
                {doneCount === 1 ? "" : "s"}
              </strong>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          </>
        )}
      </section>

      {stages.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            Etapas
          </h3>
          <ul className="space-y-0">
            {stages.map((stage) => {
              const pill = STAGE_PILL[stage.status];
              const isInProgress = stage.status === "in_progress";
              const rowClass = isInProgress
                ? "-mx-2 rounded-md bg-amber-50 px-2 dark:bg-amber-950/20"
                : "";
              return (
                <li
                  key={`${stage.position}-${stage.name}`}
                  className={`flex items-center gap-3 border-b py-2.5 last:border-0 ${rowClass}`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                      stage.status === "done"
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-input"
                    }`}
                  >
                    {stage.status === "done" && <Check className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {stage.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stage.status === "done" && stage.completed_on && (
                        <>Concluída em {formatDateBR(stage.completed_on)}</>
                      )}
                      {stage.status === "in_progress" && stage.started_on && (
                        <>Em execução desde {formatDateBR(stage.started_on)}</>
                      )}
                      {stage.status === "todo" && stage.est_days && (
                        <>Previsto · {stage.est_days} dia{stage.est_days > 1 ? "s" : ""}</>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.class}`}
                  >
                    {pill.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {view.diary.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {diaryLabel} ({view.diary_total} registro
            {view.diary_total === 1 ? "" : "s"})
          </h3>
          <div className="divide-y">
            {view.diary.map((entry, ei) => (
              <article
                key={`${entry.created_at}-${ei}`}
                className="py-3 first:pt-0"
              >
                <div className="mb-2 text-xs text-muted-foreground">
                  {formatDateBR(entry.created_at)}
                </div>
                {entry.body && (
                  <p className="mb-2 whitespace-pre-wrap text-sm">
                    {entry.body}
                  </p>
                )}
                {entry.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
                    {entry.photos
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((photo, pi) => (
                        <button
                          key={photo.id}
                          type="button"
                          aria-label={`Abrir foto ${pi + 1} do ${diaryLabel.toLowerCase()}`}
                          onClick={() => openLightbox(ei, pi)}
                          className="aspect-square overflow-hidden rounded-md bg-muted hover:opacity-90"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/q/${shareToken}/photo/${photo.id}`}
                            alt={`Foto ${pi + 1} do ${diaryLabel.toLowerCase()}`}
                            width={320}
                            height={320}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                  </div>
                )}
              </article>
            ))}
          </div>
          {view.diary_total > view.diary.length && (
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Mostrando {view.diary.length} de {view.diary_total} registros
            </div>
          )}
        </section>
      )}

      {view.last_diary_at && (
        <div className="text-center text-xs text-muted-foreground">
          Atualizado em {formatDateBR(view.last_diary_at)}
        </div>
      )}

      {view.status === "completed" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
          <CheckCircle2 className="h-5 w-5" />
          <strong>
            {vocabulary.projectSingular}{" "}
            {isProfessional ? "concluído" : "concluída"}!
          </strong>
        </div>
      )}
      {view.status === "paused" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <Pause className="h-5 w-5" />
          {vocabulary.projectSingular}{" "}
          {isProfessional ? "está pausado" : "está pausada"} no momento.
        </div>
      )}

      {currentPhotoId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada do ${diaryLabel.toLowerCase()}`}
          className="fixed inset-0 z-50 flex overscroll-contain items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Fechar"
            className="absolute right-4 top-4 rounded-md p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/q/${shareToken}/photo/${currentPhotoId}`}
            alt={`Foto ampliada do ${diaryLabel.toLowerCase()}`}
            width={1600}
            height={1200}
            className="max-h-full max-w-full object-contain"
          />
          {allPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navLightbox(-1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-3 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Anterior"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navLightbox(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-3 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Próxima"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
