"use client";

import {
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  FileUp,
  Link2,
  Loader2,
  RotateCcw,
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
  DELIVERABLE_ALLOWED_MIME_TYPES,
  DELIVERABLE_MAX_FILE_BYTES,
  formatStorageBytes,
  validateDeliverableExternalUrl,
  validateDeliverableFile,
} from "@/lib/deliverables";
import type {
  ProjectDeliverable,
  ProjectDeliverableVersion,
} from "@/lib/queries/deliverables";
import { trackProductEvent } from "@/lib/product-analytics";
import { createClient } from "@/lib/supabase/client";
import {
  createDeliverableDraftAction,
  createDeliverableVersionDraftAction,
  finalizeDeliverableUploadAction,
  reauthorizeDeliverableUploadAction,
  type DeliverableDraftResult,
} from "./deliverable-actions";

interface StageOption {
  id: string;
  name: string;
}

type DeliverableFormMode =
  | { type: "create" }
  | { type: "version"; deliverable: ProjectDeliverable };

interface DeliverableFormDialogProps {
  mode: DeliverableFormMode | null;
  projectId: string;
  stages: StageOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadAuthorization = Extract<
  DeliverableDraftResult,
  { ok: true }
>["upload"];

export function DeliverableFormDialog({
  mode,
  projectId,
  stages,
  open,
  onOpenChange,
}: DeliverableFormDialogProps) {
  const router = useRouter();
  const [sourceKind, setSourceKind] = useState<"file" | "external_link">(
    "file",
  );
  const [title, setTitle] = useState(
    mode?.type === "version" ? mode.deliverable.title : "",
  );
  const [description, setDescription] = useState(
    mode?.type === "version" ? mode.deliverable.description ?? "" : "",
  );
  const [stageId, setStageId] = useState(
    mode?.type === "version" ? mode.deliverable.stage_id ?? "" : "",
  );
  const [changeNote, setChangeNote] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "creating" | "uploading" | "finalizing"
  >("idle");
  const [transitionPending, startTransition] = useTransition();
  const busy = phase !== "idle" || transitionPending;

  const nextVersionNumber =
    mode?.type === "version"
      ? Math.max(...mode.deliverable.versions.map((version) => version.version_number), 0) + 1
      : 1;

  const dialogCopy = useMemo(() => {
    if (mode?.type === "version") {
      return {
        title: `Criar versão ${nextVersionNumber}`,
        description:
          "Envie o material revisado. A versão atual continua visível ao cliente até a publicação.",
        submit: `Criar versão ${nextVersionNumber}`,
      };
    }
    return {
      title: "Adicionar entrega",
      description:
        "Prepare o material como rascunho. Você decide quando publicar para o cliente.",
      submit: "Criar rascunho",
    };
  }, [mode, nextVersionNumber]);

  function closeDialog() {
    if (busy) return;
    onOpenChange(false);
    if (pendingVersionId) router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;
    setError(null);

    if (pendingVersionId) {
      if (!file) {
        setError("Selecione novamente o arquivo para retomar o upload.");
        return;
      }
      await resumeCurrentUpload(pendingVersionId, file);
      return;
    }

    const source = validateSource();
    if (!source.ok) {
      setError(source.error);
      return;
    }
    if (mode.type === "create" && !title.trim()) {
      setError("Informe um título para a entrega.");
      return;
    }

    setPhase("creating");
    let result: DeliverableDraftResult;
    try {
      result =
        mode.type === "create"
          ? await createDeliverableDraftAction({
              projectId,
              title: title.trim(),
              description: description.trim(),
              stageId: stageId || null,
              changeNote: changeNote.trim(),
              source: source.value,
            })
          : await createDeliverableVersionDraftAction({
              deliverableId: mode.deliverable.id,
              changeNote: changeNote.trim(),
              source: source.value,
            });
    } catch {
      setPhase("idle");
      setError(
        "Não foi possível criar o rascunho agora. Verifique sua conexão e tente novamente.",
      );
      return;
    }

    if (!result.ok) {
      setPhase("idle");
      if (
        result.code === "deliverable_limit_reached" ||
        result.code === "storage_quota_reached"
      ) {
        trackProductEvent("deliverable_quota_blocked", {
          quota: result.code,
          source_kind: source.value.sourceKind,
        });
      }
      setError(result.error);
      return;
    }

    trackProductEvent(
      mode.type === "version"
        ? "deliverable_version_created"
        : "deliverable_created",
      {
        source_kind: source.value.sourceKind,
        size_bytes:
          source.value.sourceKind === "file"
            ? source.value.sizeBytes
            : null,
      },
    );

    if (!result.upload) {
      completeDraft(mode.type === "version");
      return;
    }

    setPendingVersionId(result.versionId);
    await uploadAndFinalize(result.versionId, result.upload, source.file);
  }

  function validateSource():
    | {
        ok: true;
        value:
          | {
              sourceKind: "file";
              fileName: string;
              mimeType: string;
              sizeBytes: number;
            }
          | { sourceKind: "external_link"; externalUrl: string };
        file: File | null;
      }
    | { ok: false; error: string } {
    if (sourceKind === "external_link") {
      const validated = validateDeliverableExternalUrl(externalUrl);
      if (!validated.ok) return validated;
      return {
        ok: true,
        value: {
          sourceKind: "external_link",
          externalUrl: validated.value,
        },
        file: null,
      };
    }

    if (!file) {
      return { ok: false, error: "Selecione um arquivo para continuar." };
    }
    const validated = validateDeliverableFile({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (!validated.ok) return validated;
    return {
      ok: true,
      value: {
        sourceKind: "file",
        fileName: validated.value.fileName,
        mimeType: validated.value.mimeType,
        sizeBytes: validated.value.sizeBytes,
      },
      file,
    };
  }

  async function uploadAndFinalize(
    versionId: string,
    upload: NonNullable<UploadAuthorization>,
    selectedFile: File | null,
  ) {
    if (!selectedFile) {
      setPhase("idle");
      setError("Selecione novamente o arquivo para concluir o upload.");
      return;
    }

    setPhase("uploading");
    trackProductEvent("deliverable_upload_started", {
      size_bytes: selectedFile.size,
      mime_type: selectedFile.type,
    });
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(upload.bucket)
        .uploadToSignedUrl(upload.path, upload.token, selectedFile, {
          cacheControl: "3600",
          contentType: selectedFile.type,
        });

      if (uploadError) {
        setPhase("idle");
        trackProductEvent("deliverable_upload_failed", {
          stage: "storage",
          mime_type: selectedFile.type,
        });
        setError(
          "O upload foi interrompido. O rascunho está salvo; tente enviar o arquivo novamente.",
        );
        return;
      }

      setPhase("finalizing");
      const finalized = await finalizeDeliverableUploadAction(versionId);
      if (!finalized.ok) {
        setPhase("idle");
        trackProductEvent("deliverable_upload_failed", {
          stage: "finalize",
          mime_type: selectedFile.type,
        });
        setError(finalized.error);
        return;
      }

      trackProductEvent("deliverable_upload_completed", {
        size_bytes: selectedFile.size,
        mime_type: selectedFile.type,
      });
      completeDraft(mode?.type === "version");
    } catch {
      setPhase("idle");
      trackProductEvent("deliverable_upload_failed", {
        stage: "network",
        mime_type: selectedFile.type,
      });
      setError(
        "A conexão caiu durante o envio. O rascunho está salvo; tente novamente.",
      );
    }
  }

  async function resumeCurrentUpload(versionId: string, selectedFile: File) {
    const validated = validateDeliverableFile({
      fileName: selectedFile.name,
      mimeType: selectedFile.type,
      sizeBytes: selectedFile.size,
    });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setPhase("creating");
    const authorization = await reauthorizeDeliverableUploadAction(versionId);
    if (!authorization.ok) {
      setPhase("idle");
      setError(authorization.error);
      return;
    }
    await uploadAndFinalize(versionId, authorization.upload, selectedFile);
  }

  function completeDraft(newVersion: boolean) {
    setPhase("idle");
    setPendingVersionId(null);
    onOpenChange(false);
    toast({
      title: newVersion ? "Nova versão criada" : "Rascunho criado",
      description: "Revise os dados e publique quando estiver pronto.",
    });
    startTransition(() => router.refresh());
  }

  if (!mode) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeDialog();
      }}
    >
      <DialogContent className="max-h-[calc(100svh-1rem)] max-w-xl gap-5 overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">{dialogCopy.title}</DialogTitle>
          <DialogDescription className="leading-5">
            {dialogCopy.description}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit} noValidate>
          {mode.type === "create" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="deliverable-title">Título</Label>
                <Input
                  id="deliverable-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                  placeholder="Ex.: Planta baixa para aprovação"
                  autoFocus
                  disabled={busy || Boolean(pendingVersionId)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="deliverable-description">
                    Descrição{" "}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </Label>
                  <Textarea
                    id="deliverable-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="O que o cliente deve revisar neste material?"
                    disabled={busy || Boolean(pendingVersionId)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="deliverable-stage">
                    Etapa{" "}
                    <span className="font-normal text-muted-foreground">
                      (opcional)
                    </span>
                  </Label>
                  <select
                    id="deliverable-stage"
                    value={stageId}
                    onChange={(event) => setStageId(event.target.value)}
                    disabled={busy || Boolean(pendingVersionId)}
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
              </div>
            </>
          ) : (
            <div className="rounded-md border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Entrega</p>
              <p className="mt-0.5 text-sm font-semibold">
                {mode.deliverable.title}
              </p>
            </div>
          )}

          <fieldset disabled={busy || Boolean(pendingVersionId)}>
            <legend className="mb-2 text-sm font-medium">Origem</legend>
            <div className="grid grid-cols-2 rounded-md border bg-muted/20 p-1">
              <button
                type="button"
                aria-pressed={sourceKind === "file"}
                onClick={() => {
                  setSourceKind("file");
                  setError(null);
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-colors ${
                  sourceKind === "file"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileUp className="h-4 w-4" />
                Arquivo
              </button>
              <button
                type="button"
                aria-pressed={sourceKind === "external_link"}
                onClick={() => {
                  setSourceKind("external_link");
                  setError(null);
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-colors ${
                  sourceKind === "external_link"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link2 className="h-4 w-4" />
                Link
              </button>
            </div>
          </fieldset>

          {sourceKind === "file" ? (
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-file">
                {pendingVersionId ? "Selecione o arquivo novamente" : "Arquivo"}
              </Label>
              <Input
                key="deliverable-file"
                id="deliverable-file"
                type="file"
                accept={DELIVERABLE_ALLOWED_MIME_TYPES.join(",")}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
                disabled={busy}
                className="h-auto min-h-11 py-2"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                PDF, JPG, PNG ou WEBP de até{" "}
                {formatStorageBytes(DELIVERABLE_MAX_FILE_BYTES)}.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-link">Link HTTPS</Label>
              <Input
                key="deliverable-link"
                id="deliverable-link"
                type="url"
                inputMode="url"
                value={externalUrl}
                onChange={(event) => {
                  setExternalUrl(event.target.value);
                  setError(null);
                }}
                placeholder="https://drive.google.com/..."
                maxLength={2048}
                disabled={busy || Boolean(pendingVersionId)}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Use para arquivos pesados hospedados no Drive, OneDrive ou
                serviço semelhante.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-note">
              Nota da versão{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="deliverable-note"
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder={
                mode.type === "version"
                  ? "Ex.: Ajustes de layout solicitados pelo cliente."
                  : "Ex.: Primeira versão para validação."
              }
              disabled={busy || Boolean(pendingVersionId)}
              className="min-h-20"
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-5 text-destructive"
            >
              {error}
            </div>
          ) : null}

          {phase !== "idle" ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {phase === "creating"
                ? pendingVersionId
                  ? "Preparando novo envio…"
                  : "Criando rascunho…"
                : phase === "uploading"
                  ? "Enviando arquivo…"
                  : "Conferindo arquivo…"}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={busy}
            >
              Fechar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pendingVersionId ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              {pendingVersionId ? "Tentar upload novamente" : dialogCopy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ResumeUploadDialogProps {
  version: ProjectDeliverableVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResumeUploadDialog({
  version,
  open,
  onOpenChange,
}: ResumeUploadDialogProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "uploading">(
    "idle",
  );
  const busy = phase !== "idle";

  async function resume() {
    if (!version || !file) {
      setError("Selecione o arquivo para continuar.");
      return;
    }

    if (
      file.name !== version.file_name ||
      file.type !== version.mime_type ||
      file.size !== version.expected_size_bytes
    ) {
      setError(
        "Selecione o mesmo arquivo informado no rascunho, com nome, formato e tamanho iguais.",
      );
      return;
    }

    setError(null);
    setPhase("preparing");
    try {
      const authorization = await reauthorizeDeliverableUploadAction(
        version.id,
      );
      if (!authorization.ok) {
        setPhase("idle");
        setError(authorization.error);
        return;
      }

      setPhase("uploading");
      trackProductEvent("deliverable_upload_started", {
        size_bytes: file.size,
        mime_type: file.type,
        resumed: true,
      });
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(authorization.upload.bucket)
        .uploadToSignedUrl(
          authorization.upload.path,
          authorization.upload.token,
          file,
          {
            cacheControl: "3600",
            contentType: file.type,
          },
        );
      if (uploadError) {
        setPhase("idle");
        trackProductEvent("deliverable_upload_failed", {
          stage: "storage",
          mime_type: file.type,
          resumed: true,
        });
        setError("O envio foi interrompido. Tente novamente.");
        return;
      }

      const finalized = await finalizeDeliverableUploadAction(version.id);
      if (!finalized.ok) {
        setPhase("idle");
        trackProductEvent("deliverable_upload_failed", {
          stage: "finalize",
          mime_type: file.type,
          resumed: true,
        });
        setError(finalized.error);
        return;
      }

      trackProductEvent("deliverable_upload_completed", {
        size_bytes: file.size,
        mime_type: file.type,
        resumed: true,
      });
      setPhase("idle");
      onOpenChange(false);
      toast({
        title: "Upload concluído",
        description: "A versão está pronta para ser publicada.",
      });
      router.refresh();
    } catch {
      setPhase("idle");
      trackProductEvent("deliverable_upload_failed", {
        stage: "network",
        resumed: true,
      });
      setError("Não foi possível retomar o envio agora.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md gap-5 p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">Retomar upload</DialogTitle>
          <DialogDescription className="leading-5">
            Selecione novamente o arquivo original. O Prumo confere nome,
            formato e tamanho antes de concluir.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
          <p className="break-all font-medium">
            {version?.file_name ?? "Arquivo pendente"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatStorageBytes(version?.expected_size_bytes ?? 0)}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resume-deliverable-file">Arquivo original</Label>
          <Input
            id="resume-deliverable-file"
            type="file"
            accept={version?.mime_type ?? undefined}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
            disabled={busy}
            className="h-auto min-h-11 py-2"
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={resume} disabled={busy || !file}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {phase === "uploading" ? "Enviando…" : "Retomar upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
