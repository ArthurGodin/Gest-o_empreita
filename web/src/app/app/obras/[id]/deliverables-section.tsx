"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquareWarning,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  DELIVERABLE_STATE_LABEL,
  formatStorageBytes,
  getDeliverablePlanLimits,
  type DeliverableDisplayState,
} from "@/lib/deliverables";
import type { AppPlan } from "@/lib/plans";
import { trackProductEvent } from "@/lib/product-analytics";
import type {
  DeliverableStorageUsage,
  ProjectDeliverable,
  ProjectDeliverableVersion,
  ProjectDeliveryAcceptance,
} from "@/lib/queries/deliverables";
import { cn } from "@/lib/utils";
import {
  deleteDeliverableDraftAction,
  publishDeliverableVersionAction,
  setDeliverableArchivedAction,
  updateDeliverableAction,
} from "./deliverable-actions";
import {
  DeliverableFormDialog,
  ResumeUploadDialog,
} from "./deliverable-form-dialog";

interface DeliverablesSectionProps {
  projectId: string;
  shareToken: string | null;
  plan: AppPlan;
  projectLocked: boolean;
  stages: Array<{ id: string; name: string }>;
  deliverables: ProjectDeliverable[];
  storageUsage: DeliverableStorageUsage;
  acceptance: ProjectDeliveryAcceptance | null;
}

type ConfirmAction =
  | {
      type: "publish";
      deliverable: ProjectDeliverable;
      version: ProjectDeliverableVersion;
    }
  | { type: "archive"; deliverable: ProjectDeliverable }
  | {
      type: "delete_draft";
      deliverable: ProjectDeliverable;
      version: ProjectDeliverableVersion;
    }
  | null;

const STATE_TONE: Record<DeliverableDisplayState, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  waiting_review: "border-blue-200 bg-blue-50 text-blue-800",
  changes_requested: "border-amber-200 bg-amber-50 text-amber-900",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
};

const PLAN_LABEL: Record<AppPlan, string> = {
  free: "Grátis",
  pro: "Pro",
  ultimate: "Ultimate",
};

export function DeliverablesSection({
  projectId,
  shareToken,
  plan,
  projectLocked,
  stages,
  deliverables,
  storageUsage,
  acceptance,
}: DeliverablesSectionProps) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<
    | { type: "create" }
    | { type: "version"; deliverable: ProjectDeliverable }
    | null
  >(null);
  const [resumeVersion, setResumeVersion] =
    useState<ProjectDeliverableVersion | null>(null);
  const [editing, setEditing] = useState<ProjectDeliverable | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const limits = getDeliverablePlanLimits(plan);
  const active = useMemo(
    () => deliverables.filter((deliverable) => !deliverable.archived_at),
    [deliverables],
  );
  const archived = useMemo(
    () => deliverables.filter((deliverable) => deliverable.archived_at),
    [deliverables],
  );
  const displayed = showArchived ? archived : active;
  const publishedCount = active.filter(
    (deliverable) => deliverable.currentPublishedVersion,
  ).length;
  const activeLimitReached = active.length >= limits.activePerProject;
  const storagePercent = Math.min(
    100,
    Math.round((storageUsage.usedBytes / limits.storageBytes) * 100),
  );
  const sectionLocked = projectLocked || Boolean(acceptance);

  async function confirmSelectedAction() {
    if (!confirmAction) return;
    const actionKey = `${confirmAction.type}:${confirmAction.deliverable.id}`;
    setBusyAction(actionKey);

    try {
      const result =
        confirmAction.type === "publish"
          ? await publishDeliverableVersionAction({
              deliverableId: confirmAction.deliverable.id,
              versionId: confirmAction.version.id,
            })
          : confirmAction.type === "archive"
            ? await setDeliverableArchivedAction({
                deliverableId: confirmAction.deliverable.id,
                archived: true,
              })
            : await deleteDeliverableDraftAction({
                deliverableId: confirmAction.deliverable.id,
                versionId: confirmAction.version.id,
              });

      if (!result.ok) {
        if (
          confirmAction.type === "publish" &&
          result.code === "storage_quota_reached"
        ) {
          trackProductEvent("deliverable_quota_blocked", {
            quota: result.code,
            source: "publish",
          });
        }
        toast({
          title: "Ação não concluída",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title:
          confirmAction.type === "publish"
            ? "Versão publicada"
            : confirmAction.type === "archive"
              ? "Entrega arquivada"
              : "Rascunho removido",
        description:
          confirmAction.type === "publish"
            ? "O cliente já pode revisar esta versão no portal."
            : undefined,
      });
      if (confirmAction.type === "publish") {
        trackProductEvent("deliverable_published", {
          version_number: confirmAction.version.version_number,
          source_kind: confirmAction.version.source_kind,
        });
      }
      setConfirmAction(null);
      router.refresh();
    } catch {
      toast({
        title: "Ação não concluída",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function restoreDeliverable(deliverable: ProjectDeliverable) {
    const actionKey = `restore:${deliverable.id}`;
    setBusyAction(actionKey);
    try {
      const result = await setDeliverableArchivedAction({
        deliverableId: deliverable.id,
        archived: false,
      });
      if (!result.ok) {
        if (result.code === "deliverable_limit_reached") {
          trackProductEvent("deliverable_quota_blocked", {
            quota: result.code,
            source: "restore",
          });
        }
        toast({
          title: "Não foi possível restaurar",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Entrega restaurada" });
      router.refresh();
    } catch {
      toast({
        title: "Não foi possível restaurar",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function copyPortalLink() {
    if (!shareToken) return;
    const url = `${window.location.origin}/q/${shareToken}?tab=entregas`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "Envie ao cliente para ele revisar as entregas.",
      });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Abra o portal e copie o endereço pelo navegador.",
        variant: "destructive",
      });
    }
  }

  function openWhatsApp() {
    if (!shareToken) return;
    const url = `${window.location.origin}/q/${shareToken}?tab=entregas`;
    const message = [
      "Olá! Publiquei uma entrega para sua revisão no Prumo.",
      url,
      "Você pode visualizar e registrar sua decisão pelo link.",
    ].join("\n\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <section
      id="entregas"
      tabIndex={-1}
      className="scroll-mt-[calc(7.75rem+env(safe-area-inset-top))] rounded-lg border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:scroll-mt-24"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <PackageCheck className="h-4 w-4 text-primary" />
              Entregas
            </div>
            <h2 className="mt-0.5 text-base font-semibold">
              Materiais para revisão do cliente
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Publique plantas, relatórios, imagens ou links e mantenha cada
              decisão registrada por versão.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {publishedCount > 0 && shareToken ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyPortalLink}
                  className="h-10"
                >
                  <Link2 className="h-4 w-4" />
                  Copiar portal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openWhatsApp}
                  className="h-10"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => setFormMode({ type: "create" })}
              disabled={sectionLocked || activeLimitReached}
              className="h-10"
            >
              <Plus className="h-4 w-4" />
              Adicionar entrega
            </Button>
          </div>
        </div>

        <div className="grid divide-y rounded-md border bg-background sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Entregas ativas</span>
              <strong className="text-foreground">
                {active.length} de {limits.activePerProject}
              </strong>
            </div>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                Armazenamento {PLAN_LABEL[plan]}
              </span>
              <strong className="text-foreground">
                {formatStorageBytes(storageUsage.usedBytes)} de{" "}
                {formatStorageBytes(limits.storageBytes)}
              </strong>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Uso do armazenamento de entregas"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={storagePercent}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  storagePercent >= 90 ? "bg-amber-600" : "bg-primary",
                )}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        </div>

        {sectionLocked ? (
          <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <strong className="block">Histórico protegido</strong>
              <p className="mt-0.5 leading-5 text-emerald-900/80">
                {acceptance
                  ? `O aceite final foi registrado por ${acceptance.signer_name}.`
                  : "O projeto está encerrado e as entregas não podem mais ser alteradas."}
              </p>
            </div>
          </div>
        ) : activeLimitReached ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="leading-5">
              O limite de entregas ativas deste plano foi atingido. Arquive uma
              entrega que saiu do escopo ou ajuste o plano.
            </p>
          </div>
        ) : null}

        {archived.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {showArchived
                ? `${archived.length} arquivada${archived.length === 1 ? "" : "s"}`
                : `${active.length} ativa${active.length === 1 ? "" : "s"}`}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowArchived((current) => !current)}
              className="h-9"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Ver ativas" : "Ver arquivadas"}
            </Button>
          </div>
        ) : null}
      </div>

      {displayed.length === 0 ? (
        <div className="border-t px-4 py-8 text-center sm:px-5">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {showArchived ? (
              <Archive className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>
          <h3 className="mt-3 text-sm font-semibold">
            {showArchived ? "Nenhuma entrega arquivada" : "Nenhuma entrega ainda"}
          </h3>
          {!showArchived ? (
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              Publique plantas, relatórios, imagens ou links e receba o retorno
              do cliente.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="divide-y border-t">
          {displayed.map((deliverable) => (
            <DeliverableRow
              key={deliverable.id}
              deliverable={deliverable}
              locked={sectionLocked}
              busyAction={busyAction}
              onPublish={(version) =>
                setConfirmAction({
                  type: "publish",
                  deliverable,
                  version,
                })
              }
              onResume={setResumeVersion}
              onNewVersion={() =>
                setFormMode({ type: "version", deliverable })
              }
              onEdit={() => setEditing(deliverable)}
              onArchive={() =>
                setConfirmAction({ type: "archive", deliverable })
              }
              onRestore={() => restoreDeliverable(deliverable)}
              onDeleteDraft={(version) =>
                setConfirmAction({
                  type: "delete_draft",
                  deliverable,
                  version,
                })
              }
            />
          ))}
        </div>
      )}

      {formMode ? (
        <DeliverableFormDialog
          key={
            formMode.type === "version"
              ? `version:${formMode.deliverable.id}`
              : "create"
          }
          mode={formMode}
          projectId={projectId}
          stages={stages}
          open
          onOpenChange={(open) => {
            if (!open) setFormMode(null);
          }}
        />
      ) : null}

      {resumeVersion ? (
        <ResumeUploadDialog
          key={resumeVersion.id}
          version={resumeVersion}
          open
          onOpenChange={(open) => {
            if (!open) setResumeVersion(null);
          }}
        />
      ) : null}

      {editing ? (
        <EditDeliverableDialog
          key={editing.id}
          deliverable={editing}
          stages={stages}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      <ConfirmDeliverableActionDialog
        action={confirmAction}
        busy={Boolean(busyAction)}
        onCancel={() => {
          if (!busyAction) setConfirmAction(null);
        }}
        onConfirm={confirmSelectedAction}
      />
    </section>
  );
}

interface DeliverableRowProps {
  deliverable: ProjectDeliverable;
  locked: boolean;
  busyAction: string | null;
  onPublish: (version: ProjectDeliverableVersion) => void;
  onResume: (version: ProjectDeliverableVersion) => void;
  onNewVersion: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDeleteDraft: (version: ProjectDeliverableVersion) => void;
}

function DeliverableRow({
  deliverable,
  locked,
  busyAction,
  onPublish,
  onResume,
  onNewVersion,
  onEdit,
  onArchive,
  onRestore,
  onDeleteDraft,
}: DeliverableRowProps) {
  const current = deliverable.currentPublishedVersion;
  const draft = deliverable.draftVersion;
  const canCreateVersion =
    !locked &&
    !deliverable.archived_at &&
    !draft &&
    Boolean(current?.review);

  return (
    <article className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-sm font-semibold text-foreground">
              {deliverable.title}
            </h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                STATE_TONE[deliverable.state],
              )}
            >
              {DELIVERABLE_STATE_LABEL[deliverable.state]}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {deliverable.stage ? <span>{deliverable.stage.name}</span> : null}
            {deliverable.stage ? <span aria-hidden="true">·</span> : null}
            {current ? (
              <span>Versão {current.version_number}</span>
            ) : (
              <span>Ainda não publicada</span>
            )}
            <span aria-hidden="true">·</span>
            <span>{formatActivityDate(deliverable.lastActivityAt)}</span>
          </div>
          {deliverable.description ? (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-5 text-muted-foreground">
              {deliverable.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <PrimaryDeliverableAction
            deliverable={deliverable}
            locked={locked}
            busyAction={busyAction}
            onPublish={onPublish}
            onResume={onResume}
            onNewVersion={onNewVersion}
            onRestore={onRestore}
          />
        </div>
      </div>

      {current?.review?.action === "changes_requested" ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="min-w-0">
            <strong className="block text-xs">
              Ajustes pedidos por {current.review.signer_name}
            </strong>
            <p className="mt-1 whitespace-pre-wrap break-words leading-5">
              {current.review.comment}
            </p>
          </div>
        </div>
      ) : current?.review?.action === "approved" ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Aprovada por {current.review.signer_name} em{" "}
          {formatActivityDate(current.review.created_at)}
        </div>
      ) : current ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-blue-800">
          <Clock3 className="h-4 w-4" />
          Cliente ainda não registrou uma decisão
        </div>
      ) : null}

      <details className="group mt-3 border-t pt-3">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-1 text-xs font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4" />
            Histórico e opções
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-2 space-y-3">
          <div className="divide-y rounded-md border bg-muted/10">
            {[...deliverable.versions]
              .sort((a, b) => b.version_number - a.version_number)
              .map((version) => (
                <VersionHistoryRow key={version.id} version={version} />
              ))}
          </div>

          {!locked ? (
            <div className="flex flex-wrap gap-2">
              {!deliverable.archived_at ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onEdit}
                    className="h-9"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar dados
                  </Button>
                  {canCreateVersion ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onNewVersion}
                      className="h-9"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nova versão
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onArchive}
                    className="h-9 text-muted-foreground"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Arquivar
                  </Button>
                </>
              ) : null}
              {draft ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteDraft(draft)}
                  className="h-9 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover rascunho
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function PrimaryDeliverableAction({
  deliverable,
  locked,
  busyAction,
  onPublish,
  onResume,
  onNewVersion,
  onRestore,
}: Pick<
  DeliverableRowProps,
  | "deliverable"
  | "locked"
  | "busyAction"
  | "onPublish"
  | "onResume"
  | "onNewVersion"
  | "onRestore"
>) {
  const current = deliverable.currentPublishedVersion;
  const draft = deliverable.draftVersion;

  if (deliverable.archived_at) {
    const restoring = busyAction === `restore:${deliverable.id}`;
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRestore}
        disabled={locked || restoring}
        className="h-10 w-full sm:w-auto"
      >
        {restoring ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}
        Restaurar
      </Button>
    );
  }

  if (!locked && draft?.upload_state === "pending") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onResume(draft)}
        className="h-10 w-full sm:w-auto"
      >
        <RotateCcw className="h-4 w-4" />
        Retomar upload
      </Button>
    );
  }

  if (!locked && draft?.upload_state === "ready") {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => onPublish(draft)}
        className="h-10 w-full sm:w-auto"
      >
        <Send className="h-4 w-4" />
        Publicar v{draft.version_number}
      </Button>
    );
  }

  if (
    !locked &&
    deliverable.state === "changes_requested" &&
    !draft
  ) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={onNewVersion}
        className="h-10 w-full sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Criar nova versão
      </Button>
    );
  }

  return current ? (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="h-10 w-full sm:w-auto"
    >
      <a
        href={versionOpenUrl(current)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {current.source_kind === "file" ? (
          <FileText className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        Abrir versão
      </a>
    </Button>
  ) : null;
}

function VersionHistoryRow({
  version,
}: {
  version: ProjectDeliverableVersion;
}) {
  const published = Boolean(version.published_at);
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <strong>Versão {version.version_number}</strong>
          <span className="text-muted-foreground">
            {published
              ? formatActivityDate(version.published_at!)
              : version.upload_state === "ready"
                ? "Rascunho pronto"
                : "Upload pendente"}
          </span>
          {version.review?.action === "approved" ? (
            <span className="text-emerald-700">Aprovada</span>
          ) : version.review?.action === "changes_requested" ? (
            <span className="text-amber-800">Com ajustes</span>
          ) : published ? (
            <span className="text-blue-700">Aguardando</span>
          ) : null}
        </div>
        {version.change_note ? (
          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
            {version.change_note}
          </p>
        ) : null}
      </div>
      {version.upload_state === "ready" ? (
        <div className="flex shrink-0 gap-1">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-9 px-2.5"
          >
            <a
              href={versionOpenUrl(version)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir versão ${version.version_number}`}
            >
              {version.source_kind === "file" ? (
                <FileText className="h-3.5 w-3.5" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Abrir
            </a>
          </Button>
          {version.source_kind === "file" ? (
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              title="Baixar arquivo"
            >
              <a
                href={`/api/deliverables/${version.id}/download?download=1`}
                aria-label={`Baixar versão ${version.version_number}`}
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConfirmDeliverableActionDialog({
  action,
  busy,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy =
    action?.type === "publish"
      ? {
          title: `Publicar versão ${action.version.version_number}?`,
          description:
            "O cliente passará a ver esta versão. Depois de publicada, ela fica protegida e qualquer mudança exige uma nova versão.",
          confirm: "Publicar para o cliente",
          icon: Send,
          destructive: false,
        }
      : action?.type === "archive"
        ? {
            title: "Arquivar entrega?",
            description:
              "Ela sairá do portal do cliente, mas todo o histórico e as decisões serão preservados.",
            confirm: "Arquivar",
            icon: Archive,
            destructive: false,
          }
        : action?.type === "delete_draft"
          ? {
              title: "Remover rascunho?",
              description:
                "O arquivo pendente e esta versão não publicada serão removidos. Versões publicadas permanecem protegidas.",
              confirm: "Remover rascunho",
              icon: Trash2,
              destructive: true,
            }
          : null;

  const Icon = copy?.icon ?? AlertTriangle;

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm gap-5 p-5">
        {copy ? (
          <>
            <DialogHeader className="pr-6 text-left">
              <div
                className={cn(
                  "mb-1 flex h-9 w-9 items-center justify-center rounded-md",
                  copy.destructive
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-800",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base">{copy.title}</DialogTitle>
              <DialogDescription className="leading-5">
                {copy.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant={copy.destructive ? "destructive" : "default"}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {copy.confirm}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditDeliverableDialog({
  deliverable,
  stages,
  open,
  onOpenChange,
}: {
  deliverable: ProjectDeliverable | null;
  stages: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(deliverable?.title ?? "");
  const [description, setDescription] = useState(
    deliverable?.description ?? "",
  );
  const [stageId, setStageId] = useState(deliverable?.stage_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!deliverable) return;
    if (!title.trim()) {
      setError("Informe um título para a entrega.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await updateDeliverableAction({
        deliverableId: deliverable.id,
        title: title.trim(),
        description: description.trim(),
        stageId: stageId || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      toast({ title: "Entrega atualizada" });
      router.refresh();
    } catch {
      setError("Não foi possível salvar agora.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg gap-5 p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">Editar entrega</DialogTitle>
          <DialogDescription>
            Atualize a identificação. Arquivos e decisões das
            versões não são alterados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-deliverable-title">Título</Label>
            <Input
              id="edit-deliverable-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-deliverable-description">
              Descrição{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="edit-deliverable-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-deliverable-stage">Etapa</Label>
            <select
              id="edit-deliverable-stage"
              value={stageId}
              onChange={(event) => setStageId(event.target.value)}
              disabled={pending}
              className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 sm:text-sm"
            >
              <option value="">Sem etapa vinculada</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function versionOpenUrl(version: ProjectDeliverableVersion) {
  return version.source_kind === "external_link"
    ? version.external_url ?? "#"
    : `/api/deliverables/${version.id}/download`;
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
