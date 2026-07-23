"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareWarning,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBusinessVocabulary,
  isProfessionalSegment,
  type BusinessSegment,
} from "@/lib/business-segment";
import type {
  ProjectDeliverableReviewAction,
  ProjectDeliverableSourceKind,
} from "@/lib/supabase/types";
import { trackProductEvent } from "@/lib/product-analytics";
import { cn } from "@/lib/utils";
import { reviewDeliverableAction } from "./actions";

export interface PublicDeliverableReview {
  action: ProjectDeliverableReviewAction;
  signer_name: string;
  comment: string | null;
  created_at: string;
}

export interface PublicDeliverableVersion {
  id: string;
  version_number: number;
  source_kind: ProjectDeliverableSourceKind;
  external_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  change_note: string | null;
  published_at: string;
  review: PublicDeliverableReview | null;
}

export interface PublicDeliverableView {
  id: string;
  title: string;
  description: string | null;
  stage_name: string | null;
  current_version: PublicDeliverableVersion;
  previous_versions: PublicDeliverableVersion[];
}

interface PublicDeliverablesViewProps {
  deliverables: PublicDeliverableView[];
  shareToken: string;
  businessSegment: BusinessSegment;
}

export function PublicDeliverablesView({
  deliverables,
  shareToken,
  businessSegment,
}: PublicDeliverablesViewProps) {
  const vocabulary = getBusinessVocabulary(businessSegment);
  const professional = isProfessionalSegment(businessSegment);
  const openedTracked = useRef(false);
  const approvedCount = deliverables.filter(
    (deliverable) =>
      deliverable.current_version.review?.action === "approved",
  ).length;

  useEffect(() => {
    if (openedTracked.current) return;
    openedTracked.current = true;
    trackProductEvent("deliverable_public_opened", {
      deliverable_count: deliverables.length,
      pending_count: deliverables.length - approvedCount,
    });
  }, [approvedCount, deliverables.length]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-primary/10 p-2 text-primary">
            <PackageCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight">
              Entregas {professional ? "do projeto" : "da obra"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Abra cada material e registre se está aprovado ou se precisa
              de ajustes.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2.5">
          <div className="text-sm">
            <strong>{approvedCount}</strong> de{" "}
            <strong>{deliverables.length}</strong> entrega
            {deliverables.length === 1 ? "" : "s"} aprovada
            {approvedCount === 1 ? "" : "s"}
          </div>
          {approvedCount === deliverables.length ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Revisão concluída
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Revisão pendente
            </span>
          )}
        </div>

        {approvedCount === deliverables.length ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Quando {vocabulary.projectSingular.toLocaleLowerCase("pt-BR")}{" "}
            estiver {professional ? "concluído" : "concluída"}, o
            aceite final aparecerá na aba Cobrança.
          </p>
        ) : null}
      </section>

      <div className="space-y-3">
        {deliverables.map((deliverable) => (
          <PublicDeliverableCard
            key={deliverable.id}
            deliverable={deliverable}
            shareToken={shareToken}
          />
        ))}
      </div>
    </div>
  );
}

function PublicDeliverableCard({
  deliverable,
  shareToken,
}: {
  deliverable: PublicDeliverableView;
  shareToken: string;
}) {
  const router = useRouter();
  const version = deliverable.current_version;
  const [decision, setDecision] = useState<
    "approved" | "changes_requested" | null
  >(null);
  const [signerName, setSignerName] = useState("");
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const review = version.review;

  function submitReview() {
    if (!decision) return;
    setError(null);
    if (decision === "approved" && !confirmed) {
      setError("Confirme que você revisou esta versão.");
      return;
    }

    startTransition(async () => {
      const result = await reviewDeliverableAction({
        token: shareToken,
        version_id: version.id,
        action: decision,
        signer_name: signerName,
        comment,
      });
      if (!result.ok) {
        setError(
          result.fieldErrors?.signer_name?.[0] ??
            result.fieldErrors?.comment?.[0] ??
            result.error,
        );
        return;
      }
      trackProductEvent(
        result.action === "approved"
          ? "deliverable_approved"
          : "deliverable_changes_requested",
        {
          version_number: version.version_number,
        },
      );
      setDecision(null);
      router.refresh();
    });
  }

  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold">
              {deliverable.title}
            </h3>
            <ReviewStatus review={review} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {deliverable.stage_name ? (
              <>
                <span>{deliverable.stage_name}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>Versão {version.version_number}</span>
            <span aria-hidden="true">·</span>
            <span>{formatPublicDate(version.published_at)}</span>
          </div>
          {deliverable.description ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {deliverable.description}
            </p>
          ) : null}
          {version.change_note ? (
            <div className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-sm leading-5">
              <strong className="block text-xs text-muted-foreground">
                Nota desta versão
              </strong>
              <p className="mt-1 whitespace-pre-wrap">
                {version.change_note}
              </p>
            </div>
          ) : null}
        </div>

        <Button
          asChild
          size="sm"
          className="h-10 shrink-0"
          variant="outline"
        >
          <a
            href={publicVersionUrl(shareToken, version)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {version.source_kind === "file" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {version.source_kind === "file" ? "Visualizar" : "Abrir link"}
          </a>
        </Button>
      </div>

      {review ? (
        <div
          className={cn(
            "mt-4 flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm",
            review.action === "approved"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950",
          )}
        >
          {review.action === "approved" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          ) : (
            <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          )}
          <div className="min-w-0">
            <strong className="block">
              {review.action === "approved"
                ? `Aprovada por ${review.signer_name}`
                : `Ajustes solicitados por ${review.signer_name}`}
            </strong>
            {review.comment ? (
              <p className="mt-1 whitespace-pre-wrap break-words leading-5">
                {review.comment}
              </p>
            ) : null}
            <p className="mt-1 text-xs opacity-75">
              {formatPublicDate(review.created_at)}
            </p>
          </div>
        </div>
      ) : decision ? (
        <div className="mt-4 rounded-md border bg-muted/15 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <strong className="text-sm">
              {decision === "approved"
                ? "Aprovar esta versão"
                : "Solicitar ajustes"}
            </strong>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDecision(null);
                setError(null);
              }}
              disabled={pending}
              className="h-9"
            >
              Cancelar
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`reviewer-${version.id}`}>Seu nome</Label>
              <Input
                id={`reviewer-${version.id}`}
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                maxLength={120}
                autoComplete="name"
                disabled={pending}
              />
            </div>

            {decision === "changes_requested" ? (
              <div className="space-y-1.5">
                <Label htmlFor={`review-comment-${version.id}`}>
                  O que precisa mudar?
                </Label>
                <Textarea
                  id={`review-comment-${version.id}`}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  placeholder="Descreva o ajuste com clareza."
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 10 caracteres.
                </p>
              </div>
            ) : (
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border bg-background px-3 py-2.5 text-sm leading-5">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={pending}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-emerald-700"
                />
                Confirmo que visualizei e revisei a versão{" "}
                {version.version_number}.
              </label>
            )}

            {error ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}

            <Button
              type="button"
              onClick={submitReview}
              disabled={pending}
              className="h-11 w-full sm:w-auto"
              variant={
                decision === "changes_requested" ? "outline" : "default"
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : decision === "approved" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {decision === "approved"
                ? "Confirmar aprovação"
                : "Enviar pedido de ajustes"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDecision("changes_requested")}
            className="h-11 min-w-0 px-2"
          >
            <RotateCcw className="h-4 w-4" />
            Pedir ajustes
          </Button>
          <Button
            type="button"
            onClick={() => setDecision("approved")}
            className="h-11 min-w-0 px-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprovar versão
          </Button>
        </div>
      )}

      {deliverable.previous_versions.length > 0 ? (
        <details className="group mt-4 border-t pt-3">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between rounded-md text-xs font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span>
              Histórico ({deliverable.previous_versions.length} vers
              {deliverable.previous_versions.length === 1 ? "ão" : "ões"})
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 divide-y rounded-md border bg-muted/10">
            {[...deliverable.previous_versions]
              .sort((a, b) => b.version_number - a.version_number)
              .map((previous) => (
                <div key={previous.id} className="px-3 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>Versão {previous.version_number}</strong>
                    <span className="text-muted-foreground">
                      {formatPublicDate(previous.published_at)}
                    </span>
                    <span
                      className={cn(
                        previous.review?.action === "approved"
                          ? "text-emerald-700"
                          : "text-amber-800",
                      )}
                    >
                      {previous.review?.action === "approved"
                        ? "Aprovada"
                        : "Substituída apó ajustes"}
                    </span>
                  </div>
                  {previous.change_note ? (
                    <p className="mt-1 leading-5 text-muted-foreground">
                      {previous.change_note}
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function ReviewStatus({
  review,
}: {
  review: PublicDeliverableReview | null;
}) {
  if (review?.action === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Aprovada
      </span>
    );
  }
  if (review?.action === "changes_requested") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
        <MessageSquareWarning className="h-3 w-3" />
        Ajustes solicitados
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
      <Clock3 className="h-3 w-3" />
      Aguardando decisão
    </span>
  );
}

function publicVersionUrl(
  shareToken: string,
  version: PublicDeliverableVersion,
) {
  return version.source_kind === "external_link"
    ? version.external_url ?? "#"
    : `/q/${shareToken}/deliverables/${version.id}`;
}

function formatPublicDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
