"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  ExternalLink,
  History,
  Loader2,
  LockKeyhole,
  MessageCircle,
  RefreshCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { getArchitecturePlanLimits } from "@/lib/architecture-plan-limits";
import {
  formatBriefingAnswer,
  getAvailableSuggestedProjectSpaces,
  getBriefingTemplatesForSegment,
  type BriefingTemplateSummary,
  type SuggestedProjectSpace,
} from "@/lib/briefings";
import type { BusinessSegment } from "@/lib/business-segment";
import type { AppPlan } from "@/lib/plans";
import { trackProductEvent } from "@/lib/product-analytics";
import { formatDateTimeBR } from "@/lib/utils";
import type { ProjectBriefing } from "@/lib/queries/briefings";
import type { ProjectSpace } from "@/lib/queries/project-spaces";
import type { PublicProjectAccessKind } from "@/lib/queries/public-project-access";
import {
  archiveProjectBriefingAction,
  createProjectBriefingAction,
  regenerateProjectClientAccessTokenAction,
  reopenProjectBriefingAction,
  reviewProjectBriefingAction,
  shareProjectBriefingAction,
} from "./briefing-actions";
import { createSuggestedProjectSpacesAction } from "./space-actions";

const STATUS_COPY = {
  draft: {
    label: "Rascunho",
    className: "border-border bg-muted text-muted-foreground",
  },
  shared: {
    label: "Com o cliente",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  submitted: {
    label: "Respostas recebidas",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  reviewed: {
    label: "Revisado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  archived: {
    label: "Arquivado",
    className: "border-border bg-muted text-muted-foreground",
  },
} as const;

interface BriefingSectionProps {
  projectId: string;
  plan: AppPlan;
  segment: BusinessSegment;
  briefing: ProjectBriefing | null;
  spaces: ProjectSpace[];
  publicUrl: string | null;
  publicAccessKind: PublicProjectAccessKind | null;
  canManagePublicLink: boolean;
  projectLocked: boolean;
}

type ActiveDialog =
  | "create"
  | "review"
  | "reopen"
  | "archive"
  | "regenerate_link"
  | null;

export function BriefingSection({
  projectId,
  plan,
  segment,
  briefing,
  spaces,
  publicUrl,
  publicAccessKind,
  canManagePublicLink,
  projectLocked,
}: BriefingSectionProps) {
  const router = useRouter();
  const templates = getBriefingTemplatesForSegment(segment);
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(briefing?.internalNotes ?? "");
  const [reopenNote, setReopenNote] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(
    templates[0]?.key ?? "",
  );
  const planLimits = getArchitecturePlanLimits(plan);
  const canReopenBriefing = briefing
    ? briefing.revisionHistory.length < planLimits.revisionsPerBriefing
    : false;
  const suggestions = useMemo(() => {
    if (!briefing) return [];

    return getAvailableSuggestedProjectSpaces(
      briefing.activeRevision.snapshot,
      briefing.activeRevision.answers,
      spaces,
      planLimits.activeSpacesPerProject,
    );
  }, [briefing, planLimits.activeSpacesPerProject, spaces]);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(
    suggestions.map((space) => suggestionKey(space)),
  );

  async function createBriefing() {
    if (!selectedTemplate) return;
    setPending(true);
    setError(null);
    try {
      const result = await createProjectBriefingAction({
        projectId,
        templateKey: selectedTemplate,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialog(null);
      trackProductEvent("briefing_created", {
        template: selectedTemplate,
        segment,
      });
      toast({
        title: "Briefing criado",
        description: "Revise o modelo e compartilhe quando estiver pronto.",
      });
      router.refresh();
    } catch {
      setError("Não foi possível criar o briefing agora.");
    } finally {
      setPending(false);
    }
  }

  async function shareBriefing() {
    if (!briefing) return;
    setPending(true);
    setError(null);
    try {
      const result = await shareProjectBriefingAction({
        briefingId: briefing.id,
        projectId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      trackProductEvent("briefing_shared", {
        template: briefing.templateKey,
        revision: briefing.activeRevision.revisionNumber,
      });
      toast({
        title: "Briefing liberado",
        description: "O cliente já pode preencher pelo link público.",
      });
      router.refresh();
    } catch {
      setError("Não foi possível liberar o briefing.");
    } finally {
      setPending(false);
    }
  }

  async function reviewBriefing() {
    if (!briefing) return;
    setPending(true);
    setError(null);
    try {
      const result = await reviewProjectBriefingAction({
        briefingId: briefing.id,
        projectId,
        internalNotes: notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialog(null);
      trackProductEvent("briefing_reviewed", {
        template: briefing.templateKey,
        revision: briefing.activeRevision.revisionNumber,
      });
      toast({ title: "Briefing revisado" });
      router.refresh();
    } catch {
      setError("Não foi possível concluir a revisão.");
    } finally {
      setPending(false);
    }
  }

  async function reopenBriefing() {
    if (!briefing || !canReopenBriefing) return;
    setPending(true);
    setError(null);
    try {
      const result = await reopenProjectBriefingAction({
        briefingId: briefing.id,
        projectId,
        note: reopenNote,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialog(null);
      setReopenNote("");
      trackProductEvent("briefing_reopened", {
        template: briefing.templateKey,
        revision: briefing.activeRevision.revisionNumber + 1,
      });
      toast({
        title: "Nova revisão aberta",
        description: "O cliente pode complementar as respostas pelo mesmo link.",
      });
      router.refresh();
    } catch {
      setError("Não foi possível abrir uma nova revisão.");
    } finally {
      setPending(false);
    }
  }

  async function archiveBriefing() {
    if (!briefing) return;
    setPending(true);
    setError(null);
    try {
      const result = await archiveProjectBriefingAction({
        briefingId: briefing.id,
        projectId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialog(null);
      toast({
        title: "Briefing arquivado",
        description: "O histórico foi preservado.",
      });
      router.refresh();
    } catch {
      setError("Não foi possível arquivar agora.");
    } finally {
      setPending(false);
    }
  }

  async function regeneratePublicLink() {
    setPending(true);
    setError(null);
    try {
      const result = await regenerateProjectClientAccessTokenAction({
        projectId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialog(null);
      toast({
        title: "Novo link gerado",
        description: "O link anterior deixou de funcionar imediatamente.",
      });
      router.refresh();
    } catch {
      setError("Não foi possível gerar um novo link agora.");
    } finally {
      setPending(false);
    }
  }

  async function createSuggestedSpaces() {
    if (!briefing) return;
    const chosen = suggestions.filter((space) =>
      selectedSpaces.includes(suggestionKey(space)),
    );
    if (chosen.length === 0) {
      setError("Selecione ao menos um ambiente.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await createSuggestedProjectSpacesAction({
        projectId,
        sourceRevisionId: briefing.activeRevision.id,
        spaces: chosen.map((space) => ({
          name: space.name,
          spaceType: space.spaceType,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      trackProductEvent("project_spaces_created_from_briefing", {
        count: chosen.length,
        template: briefing.templateKey,
      });
      toast({
        title: "Ambientes adicionados",
        description: "Agora complemente prioridades e necessidades.",
      });
      router.refresh();
    } catch {
      setError("Não foi possível adicionar os ambientes.");
    } finally {
      setPending(false);
    }
  }

  function openDialog(next: ActiveDialog) {
    setError(null);
    setDialog(next);
  }

  if (!briefing) {
    return (
      <>
        <section
          aria-labelledby="briefing-title"
          className="overflow-hidden rounded-lg border bg-card"
        >
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id="briefing-title" className="text-base font-semibold">
                  Briefing do projeto
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
                  Colete rotina, prioridades, referências e limites antes de
                  avançar para as soluções.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => openDialog("create")}
              disabled={projectLocked || templates.length === 0}
              className="w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              Criar briefing
            </Button>
          </div>
          {plan === "free" ? (
            <div className="border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
              O Grátis permite experimentar um briefing completo e até 3
              ambientes.
            </div>
          ) : null}
        </section>
        <CreateBriefingDialog
          open={dialog === "create"}
          onOpenChange={(open) => setDialog(open ? "create" : null)}
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelect={setSelectedTemplate}
          onSubmit={createBriefing}
          pending={pending}
          error={error}
        />
      </>
    );
  }

  const statusCopy = STATUS_COPY[briefing.status];
  const editable = briefing.status === "draft" || briefing.status === "shared";
  const submitted =
    briefing.status === "submitted" || briefing.status === "reviewed";
  const canUsePublicLink = briefing.status !== "draft" && publicUrl;

  return (
    <>
      <section
        aria-labelledby="briefing-title"
        className="overflow-hidden rounded-lg border bg-card"
      >
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="briefing-title" className="text-base font-semibold">
                  Briefing do projeto
                </h2>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${statusCopy.className}`}
                >
                  {statusCopy.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  Revisão {briefing.activeRevision.revisionNumber}
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {briefing.activeRevision.snapshot.name}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {briefing.status === "draft" ? (
                <Button
                  type="button"
                  onClick={shareBriefing}
                  disabled={pending || projectLocked}
                  className="w-full sm:w-auto"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Compartilhar
                </Button>
              ) : null}
              {canUsePublicLink ? (
                <CopyButton
                  text={publicUrl}
                  label="Copiar link"
                  variant="outline"
                  className="w-full sm:w-auto"
                  successTitle="Link do briefing copiado"
                />
              ) : null}
              {briefing.status === "submitted" ? (
                <Button
                  type="button"
                  onClick={() => openDialog("review")}
                  disabled={pending || projectLocked}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Concluir revisão
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-foreground">
                Preenchimento obrigatório
              </span>
              <span className="font-semibold tabular-nums text-emerald-800">
                {briefing.activeRevision.progress}%
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progresso do briefing"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={briefing.activeRevision.progress}
            >
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${briefing.activeRevision.progress}%` }}
              />
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
              {error.includes("Assine o Pro") ? (
                <Link
                  href="/app/configuracoes/plano"
                  className="ml-1 font-semibold underline underline-offset-2"
                >
                  Ver plano
                </Link>
              ) : null}
            </div>
          ) : null}

          {briefing.activeRevision.reopenNote && editable ? (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950">
              <RefreshCcw className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong className="text-xs">Orientação desta revisão</strong>
                <p className="mt-1 whitespace-pre-wrap leading-5">
                  {briefing.activeRevision.reopenNote}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {submitted ? (
          <div className="border-t">
            <div className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Respostas do cliente</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {briefing.activeRevision.respondentName
                      ? `Enviado por ${briefing.activeRevision.respondentName}`
                      : "Envio concluído"}
                    {briefing.activeRevision.submittedAt
                      ? ` · ${formatDateTime(briefing.activeRevision.submittedAt)}`
                      : ""}
                  </p>
                </div>
                {briefing.status === "reviewed" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                    <Check className="h-3.5 w-3.5" />
                    Revisado
                  </span>
                ) : null}
              </div>
            </div>
            <BriefingAnswerList briefing={briefing} />
          </div>
        ) : (
          <div className="border-t bg-muted/15 px-4 py-3 text-sm text-muted-foreground sm:px-5">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {briefing.status === "draft"
                ? "O cliente verá o formulário depois que você compartilhar."
                : `O cliente já pode preencher. Progresso atual: ${briefing.activeRevision.progress}%.`}
            </span>
          </div>
        )}

        {submitted && suggestions.length > 0 ? (
          <SuggestedSpaces
            suggestions={suggestions}
            selected={selectedSpaces}
            onToggle={(key) =>
              setSelectedSpaces((current) =>
                current.includes(key)
                  ? current.filter((item) => item !== key)
                  : [...current, key],
              )
            }
            onCreate={createSuggestedSpaces}
            pending={pending}
          />
        ) : null}

        <div className="border-t bg-muted/10 px-4 py-3 sm:px-5">
          <details className="group">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-1 text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico e opções
              </span>
              <span className="text-xs font-normal">
                {briefing.revisionHistory.length}{" "}
                {briefing.revisionHistory.length === 1
                  ? "revisão"
                  : "revisões"}
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="divide-y rounded-md border bg-card">
                {briefing.revisionHistory.map((revision) => (
                  <div
                    key={revision.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
                  >
                    <strong>Revisão {revision.revisionNumber}</strong>
                    <span className="text-muted-foreground">
                      {revision.submittedAt
                        ? `Enviada ${formatDateTime(revision.submittedAt)}`
                        : "Em preenchimento"}
                    </span>
                  </div>
                ))}
              </div>
              {!projectLocked ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {submitted ? (
                    canReopenBriefing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog("reopen")}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Abrir nova revisão
                      </Button>
                    ) : (
                      <div className="flex flex-col items-start gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          <LockKeyhole className="h-4 w-4" />
                          Limite de revisões
                        </Button>
                        {plan === "free" ? (
                          <Link
                            href="/app/configuracoes/plano"
                            className="text-xs font-semibold text-emerald-800 underline underline-offset-2"
                          >
                            Comparar planos
                          </Link>
                        ) : null}
                      </div>
                    )
                  ) : null}
                  {canUsePublicLink ? (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Olá! Você pode preencher o briefing do projeto por este link: ${publicUrl}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Enviar pelo WhatsApp
                      </a>
                    </Button>
                  ) : null}
                  {canUsePublicLink &&
                  publicAccessKind === "project" &&
                  canManagePublicLink ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog("regenerate_link")}
                    >
                      <LockKeyhole className="h-4 w-4" />
                      Gerar novo link
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => openDialog("archive")}
                    className="text-muted-foreground"
                  >
                    <Archive className="h-4 w-4" />
                    Arquivar
                  </Button>
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </section>

      <ReviewDialog
        open={dialog === "review"}
        onOpenChange={(open) => setDialog(open ? "review" : null)}
        notes={notes}
        onNotesChange={setNotes}
        pending={pending}
        error={dialog === "review" ? error : null}
        onSubmit={reviewBriefing}
      />
      <ReopenDialog
        open={dialog === "reopen"}
        onOpenChange={(open) => setDialog(open ? "reopen" : null)}
        note={reopenNote}
        onNoteChange={setReopenNote}
        pending={pending}
        error={dialog === "reopen" ? error : null}
        onSubmit={reopenBriefing}
      />
      <ArchiveDialog
        open={dialog === "archive"}
        onOpenChange={(open) => setDialog(open ? "archive" : null)}
        pending={pending}
        error={dialog === "archive" ? error : null}
        onSubmit={archiveBriefing}
      />
      <RegeneratePublicLinkDialog
        open={dialog === "regenerate_link"}
        onOpenChange={(open) =>
          setDialog(open ? "regenerate_link" : null)
        }
        pending={pending}
        error={dialog === "regenerate_link" ? error : null}
        onSubmit={regeneratePublicLink}
      />
    </>
  );
}

function CreateBriefingDialog({
  open,
  onOpenChange,
  templates,
  selectedTemplate,
  onSelect,
  onSubmit,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: BriefingTemplateSummary[];
  selectedTemplate: string;
  onSelect: (key: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">Escolha o briefing</DialogTitle>
          <DialogDescription>
            O modelo será copiado para este projeto e não mudará sozinho.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {templates.map((template) => {
            const selected = selectedTemplate === template.key;
            return (
              <label
                key={template.key}
                className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  selected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-input bg-card hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="briefing-template"
                  value={template.key}
                  checked={selected}
                  onChange={() => onSelect(template.key)}
                  className="mt-1 h-4 w-4 accent-emerald-600"
                />
                <span className="min-w-0">
                  <strong className="block text-sm">{template.name}</strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {template.description}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-muted-foreground">
                    {template.sectionCount} blocos · {template.questionCount} perguntas
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {error ? <DialogError>{error}</DialogError> : null}
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={pending || !selectedTemplate}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Criar briefing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BriefingAnswerList({ briefing }: { briefing: ProjectBriefing }) {
  const { snapshot, answers } = briefing.activeRevision;
  return (
    <div className="divide-y">
      {snapshot.sections.map((section, index) => (
        <details key={section.id} open={index === 0} className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold outline-none hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
            {section.title}
            <ExternalLink className="h-3.5 w-3.5 rotate-90 text-muted-foreground transition-transform group-open:rotate-0" />
          </summary>
          <dl className="border-t bg-muted/10 px-4 py-1 sm:px-5">
            {section.questions.map((question) => (
              <div
                key={question.id}
                className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.2fr)] sm:gap-5"
              >
                <dt className="text-xs font-medium leading-5 text-muted-foreground">
                  {question.label}
                </dt>
                <dd className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">
                  {formatBriefingAnswer(question, answers[question.id])}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
    </div>
  );
}

function SuggestedSpaces({
  suggestions,
  selected,
  onToggle,
  onCreate,
  pending,
}: {
  suggestions: SuggestedProjectSpace[];
  selected: string[];
  onToggle: (key: string) => void;
  onCreate: () => void;
  pending: boolean;
}) {
  return (
    <div className="border-t px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-800">
          <DoorOpen className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            Montar ambientes a partir do briefing
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Confirme o que realmente entra neste projeto. Nada será criado sem
            sua escolha.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((space) => {
              const key = suggestionKey(space);
              const checked = selected.includes(key);
              return (
                <label
                  key={key}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    checked
                      ? "border-sky-400 bg-sky-50 text-sky-950"
                      : "border-input bg-card"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(key)}
                    className="h-4 w-4 accent-sky-600"
                  />
                  <span className="break-words">{space.name}</span>
                </label>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onCreate}
            disabled={pending || selected.length === 0}
            className="mt-3 w-full sm:w-auto"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DoorOpen className="h-4 w-4" />
            )}
            Adicionar {selected.length || ""} ambiente
            {selected.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReviewDialog({
  open,
  onOpenChange,
  notes,
  onNotesChange,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-w-lg p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">Concluir revisão</DialogTitle>
          <DialogDescription>
            Registre apenas observações internas. As respostas do cliente ficam
            protegidas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="briefing-internal-notes">
            Observações internas{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="briefing-internal-notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            maxLength={5000}
            rows={5}
          />
        </div>
        {error ? <DialogError>{error}</DialogError> : null}
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Marcar como revisado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReopenDialog({
  open,
  onOpenChange,
  note,
  onNoteChange,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
  onNoteChange: (value: string) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-w-lg p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">Abrir nova revisão?</DialogTitle>
          <DialogDescription>
            As respostas atuais continuarão protegidas. O cliente receberá uma
            cópia editável pelo mesmo link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="briefing-reopen-note">
            O que precisa ser complementado?{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="briefing-reopen-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            maxLength={1000}
            rows={4}
          />
        </div>
        {error ? <DialogError>{error}</DialogError> : null}
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Abrir revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveDialog({
  open,
  onOpenChange,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-w-sm p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">Arquivar briefing?</DialogTitle>
          <DialogDescription>
            Ele sairá do link do cliente, mas respostas e revisões serão
            preservadas.
          </DialogDescription>
        </DialogHeader>
        {error ? <DialogError>{error}</DialogError> : null}
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onSubmit}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegeneratePublicLinkDialog({
  open,
  onOpenChange,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-w-sm p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">Gerar um novo link?</DialogTitle>
          <DialogDescription>
            O link atual deixará de funcionar imediatamente. Gere outro apenas
            se ele foi enviado à pessoa errada ou ficou exposto.
          </DialogDescription>
        </DialogHeader>
        {error ? <DialogError>{error}</DialogError> : null}
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Manter link atual
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LockKeyhole className="h-4 w-4" />
            )}
            Gerar novo link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </div>
  );
}

function suggestionKey(space: SuggestedProjectSpace) {
  return `${space.spaceType}:${space.name}`;
}

function formatDateTime(value: string) {
  return formatDateTimeBR(value, {
    dateStyle: "short",
    timeStyle: "short",
  });
}
