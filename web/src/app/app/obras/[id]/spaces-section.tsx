"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Circle,
  Copy,
  DoorOpen,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Ruler,
  Trash2,
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
import { getArchitecturePlanLimits } from "@/lib/architecture-plan-limits";
import type { AppPlan } from "@/lib/plans";
import { trackProductEvent } from "@/lib/product-analytics";
import type {
  ProjectSpace,
  ProjectSpaceRequirement,
} from "@/lib/queries/project-spaces";
import type {
  ProjectSpacePriority,
  ProjectSpaceRequirementKind,
  ProjectSpaceStatus,
} from "@/lib/supabase/types";
import {
  addSpaceRequirementAction,
  createProjectSpaceAction,
  deleteSpaceRequirementAction,
  duplicateProjectSpaceAction,
  moveProjectSpaceAction,
  setProjectSpaceArchivedAction,
  setSpaceRequirementStatusAction,
  updateProjectSpaceAction,
} from "./space-actions";

const SPACE_TYPES = [
  { value: "living", label: "Sala de estar" },
  { value: "dining", label: "Sala de jantar" },
  { value: "kitchen", label: "Cozinha" },
  { value: "bedroom", label: "Quarto" },
  { value: "suite", label: "Suíte" },
  { value: "bathroom", label: "Banheiro" },
  { value: "office", label: "Escritório" },
  { value: "balcony", label: "Varanda" },
  { value: "laundry", label: "Lavanderia" },
  { value: "reception", label: "Recepção" },
  { value: "service", label: "Atendimento" },
  { value: "sales", label: "Área de vendas" },
  { value: "workspace", label: "Área de trabalho" },
  { value: "meeting", label: "Sala de reunião" },
  { value: "stock", label: "Estoque" },
  { value: "support", label: "Apoio" },
  { value: "other", label: "Outro" },
] as const;

const PRIORITY_COPY: Record<
  ProjectSpacePriority,
  { label: string; className: string }
> = {
  low: { label: "Baixa", className: "bg-slate-100 text-slate-700" },
  normal: { label: "Normal", className: "bg-sky-50 text-sky-800" },
  high: { label: "Alta", className: "bg-amber-50 text-amber-900" },
  essential: {
    label: "Essencial",
    className: "bg-rose-50 text-rose-800",
  },
};

const REQUIREMENT_KIND_COPY: Record<ProjectSpaceRequirementKind, string> = {
  need: "Necessidade",
  constraint: "Restrição",
  preference: "Preferência",
};

interface SpacesSectionProps {
  projectId: string;
  plan: AppPlan;
  spaces: ProjectSpace[];
  projectLocked: boolean;
}

export function SpacesSection({
  projectId,
  plan,
  spaces,
  projectLocked,
}: SpacesSectionProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectSpace | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = getArchitecturePlanLimits(plan).activeSpacesPerProject;

  function startCreate() {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  }

  function startEdit(space: ProjectSpace) {
    setEditing(space);
    setError(null);
    setFormOpen(true);
  }

  async function runRowAction(
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    successTitle?: string,
  ) {
    setBusyAction(key);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Não foi possível concluir.");
        return;
      }
      if (successTitle) toast({ title: successTitle });
      router.refresh();
    } catch {
      setError("Não foi possível concluir agora.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section
      aria-labelledby="spaces-title"
      className="overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-800">
            <DoorOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="spaces-title" className="text-base font-semibold">
                Ambientes e necessidades
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {spaces.length} de {limit}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              Organize o que cada espaço precisa resolver antes de detalhar as
              entregas.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={startCreate}
          disabled={projectLocked}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Adicionar ambiente
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="mx-4 mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-5"
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

      {spaces.length === 0 ? (
        <div className="border-t px-4 py-6 text-center sm:px-5">
          <DoorOpen className="mx-auto h-6 w-6 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">
            Monte o programa de necessidades
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-muted-foreground">
            Adicione manualmente ou use os ambientes sugeridos depois que o
            cliente enviar o briefing.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={startCreate}
            disabled={projectLocked}
            className="mt-3"
          >
            <Plus className="h-4 w-4" />
            Primeiro ambiente
          </Button>
        </div>
      ) : (
        <div className="divide-y border-t">
          {spaces.map((space, index) => (
            <SpaceRow
              key={space.id}
              space={space}
              projectId={projectId}
              projectLocked={projectLocked}
              first={index === 0}
              last={index === spaces.length - 1}
              busyAction={busyAction}
              onEdit={() => startEdit(space)}
              onRunAction={runRowAction}
            />
          ))}
        </div>
      )}

      {plan === "free" ? (
        <div className="border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          O Grátis permite até 3 ambientes. O Pro libera capacidade para o
          trabalho profissional.
        </div>
      ) : null}

      {formOpen ? (
        <SpaceFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={projectId}
          space={editing}
          onSaved={() => {
            setFormOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

function SpaceRow({
  space,
  projectId,
  projectLocked,
  first,
  last,
  busyAction,
  onEdit,
  onRunAction,
}: {
  space: ProjectSpace;
  projectId: string;
  projectLocked: boolean;
  first: boolean;
  last: boolean;
  busyAction: string | null;
  onEdit: () => void;
  onRunAction: (
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    successTitle?: string,
  ) => Promise<void>;
}) {
  const [requirementOpen, setRequirementOpen] = useState(false);
  const pendingCount = space.requirements.filter(
    (requirement) => requirement.status === "pending",
  ).length;
  const priority = PRIORITY_COPY[space.priority];

  return (
    <article className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-semibold text-foreground">
              {space.name}
            </h3>
            <span
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${priority.className}`}
            >
              {priority.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                space.status === "defined"
                  ? "text-emerald-800"
                  : "text-amber-800"
              }`}
            >
              {space.status === "defined" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              {space.status === "defined" ? "Definido" : "Em definição"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{spaceTypeLabel(space.spaceType)}</span>
            {space.areaM2 ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Ruler className="h-3.5 w-3.5" />
                {formatArea(space.areaM2)} m²
              </span>
            ) : null}
            <span>
              {space.requirements.length} item
              {space.requirements.length === 1 ? "" : "s"}
              {pendingCount > 0 ? ` · ${pendingCount} pendente${pendingCount === 1 ? "" : "s"}` : ""}
            </span>
          </div>
        </div>
        {!projectLocked ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                onRunAction(
                  `move-up:${space.id}`,
                  () =>
                    moveProjectSpaceAction({
                      spaceId: space.id,
                      projectId,
                      direction: "up",
                    }),
                )
              }
              disabled={first || busyAction !== null}
              title="Mover ambiente para cima"
              aria-label={`Mover ${space.name} para cima`}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                onRunAction(
                  `move-down:${space.id}`,
                  () =>
                    moveProjectSpaceAction({
                      spaceId: space.id,
                      projectId,
                      direction: "down",
                    }),
                )
              }
              disabled={last || busyAction !== null}
              title="Mover ambiente para baixo"
              aria-label={`Mover ${space.name} para baixo`}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="hidden sm:inline-flex"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </div>
        ) : null}
      </div>

      {space.notes ? (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">
          {space.notes}
        </p>
      ) : null}

      <details className="group mt-3">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 text-sm font-semibold outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span>
            Necessidades
            {pendingCount > 0 ? (
              <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900">
                {pendingCount} pendente{pendingCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 rounded-md border">
          {space.requirements.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Nenhuma necessidade registrada.
            </p>
          ) : (
            <div className="divide-y">
              {space.requirements.map((requirement) => (
                <RequirementRow
                  key={requirement.id}
                  requirement={requirement}
                  projectId={projectId}
                  disabled={projectLocked || busyAction !== null}
                  onRunAction={onRunAction}
                />
              ))}
            </div>
          )}
          {!projectLocked ? (
            <div className="border-t p-2.5">
              {requirementOpen ? (
                <RequirementForm
                  projectId={projectId}
                  spaceId={space.id}
                  onCancel={() => setRequirementOpen(false)}
                  onSaved={() => setRequirementOpen(false)}
                />
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRequirementOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar necessidade
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </details>

      {!projectLocked ? (
        <details className="group mt-2">
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-xs font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="h-4 w-4" />
            Opções do ambiente
          </summary>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="sm:hidden"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busyAction !== null}
              onClick={() =>
                onRunAction(
                  `duplicate:${space.id}`,
                  () =>
                    duplicateProjectSpaceAction({
                      spaceId: space.id,
                      projectId,
                    }),
                  "Ambiente duplicado",
                )
              }
            >
              {busyAction === `duplicate:${space.id}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Duplicar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyAction !== null}
              onClick={() =>
                onRunAction(
                  `archive:${space.id}`,
                  () =>
                    setProjectSpaceArchivedAction({
                      spaceId: space.id,
                      projectId,
                      archived: true,
                    }),
                  "Ambiente arquivado",
                )
              }
              className="text-muted-foreground"
            >
              <Archive className="h-4 w-4" />
              Arquivar
            </Button>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function RequirementRow({
  requirement,
  projectId,
  disabled,
  onRunAction,
}: {
  requirement: ProjectSpaceRequirement;
  projectId: string;
  disabled: boolean;
  onRunAction: (
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    successTitle?: string,
  ) => Promise<void>;
}) {
  const defined = requirement.status === "defined";
  return (
    <div className="flex items-start gap-2 px-3 py-2.5">
      <button
        type="button"
        onClick={() =>
          onRunAction(
            `requirement:${requirement.id}`,
            () =>
              setSpaceRequirementStatusAction({
                projectId,
                requirementId: requirement.id,
                status: defined ? "pending" : "defined",
              }),
          )
        }
        disabled={disabled}
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          defined
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-input bg-card text-muted-foreground"
        }`}
        aria-label={
          defined
            ? `Marcar ${requirement.description} como pendente`
            : `Marcar ${requirement.description} como definida`
        }
      >
        {defined ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`break-words text-sm leading-5 ${
            defined ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {requirement.description}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {REQUIREMENT_KIND_COPY[requirement.kind]} ·{" "}
          {PRIORITY_COPY[requirement.priority].label}
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        onClick={() =>
          onRunAction(
            `delete-requirement:${requirement.id}`,
            () =>
              deleteSpaceRequirementAction({
                projectId,
                requirementId: requirement.id,
              }),
          )
        }
        className="h-9 w-9 text-muted-foreground hover:text-destructive"
        aria-label={`Remover ${requirement.description}`}
        title="Remover necessidade"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RequirementForm({
  projectId,
  spaceId,
  onCancel,
  onSaved,
}: {
  projectId: string;
  spaceId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ProjectSpaceRequirementKind>("need");
  const [priority, setPriority] = useState<ProjectSpacePriority>("normal");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!description.trim()) {
      setError("Descreva a necessidade.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await addSpaceRequirementAction({
        projectId,
        spaceId,
        kind,
        description,
        priority,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
      router.refresh();
    } catch {
      setError("Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`requirement-${spaceId}`}>Descrição</Label>
        <Textarea
          id={`requirement-${spaceId}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={2}
          className="min-h-20"
          autoFocus
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`requirement-kind-${spaceId}`}>Tipo</Label>
          <select
            id={`requirement-kind-${spaceId}`}
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as ProjectSpaceRequirementKind)
            }
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
          >
            <option value="need">Necessidade</option>
            <option value="constraint">Restrição</option>
            <option value="preference">Preferência</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`requirement-priority-${spaceId}`}>Prioridade</Label>
          <select
            id={`requirement-priority-${spaceId}`}
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as ProjectSpacePriority)
            }
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
          >
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="essential">Essencial</option>
          </select>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function SpaceFormDialog({
  open,
  onOpenChange,
  projectId,
  space,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  space: ProjectSpace | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(space?.name ?? "");
  const [spaceType, setSpaceType] = useState(space?.spaceType ?? "other");
  const [area, setArea] = useState(
    space?.areaM2 != null ? String(space.areaM2).replace(".", ",") : "",
  );
  const [priority, setPriority] = useState<ProjectSpacePriority>(
    space?.priority ?? "normal",
  );
  const [status, setStatus] = useState<ProjectSpaceStatus>(
    space?.status ?? "incomplete",
  );
  const [notes, setNotes] = useState(space?.notes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsedArea = area.trim()
      ? Number(area.trim().replace(",", "."))
      : null;
    if (!name.trim()) {
      setError("Informe o nome do ambiente.");
      return;
    }
    if (parsedArea !== null && (!Number.isFinite(parsedArea) || parsedArea <= 0)) {
      setError("Informe uma área válida.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result = space
        ? await updateProjectSpaceAction({
            spaceId: space.id,
            projectId,
            name,
            spaceType,
            areaM2: parsedArea,
            priority,
            status,
            notes,
          })
        : await createProjectSpaceAction({
            projectId,
            name,
            spaceType,
            areaM2: parsedArea,
            priority,
            status,
            notes,
          });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!space) {
        trackProductEvent("project_space_created", {
          space_type: spaceType,
          source: "manual",
        });
      }
      toast({ title: space ? "Ambiente atualizado" : "Ambiente criado" });
      onSaved();
    } catch {
      setError("Não foi possível salvar agora.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-base">
            {space ? "Editar ambiente" : "Novo ambiente"}
          </DialogTitle>
          <DialogDescription>
            Registre somente o necessário para orientar as próximas decisões.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="space-name">Nome</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="Ex.: Cozinha integrada"
              autoFocus
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="space-type">Tipo</Label>
              <select
                id="space-type"
                value={spaceType}
                onChange={(event) => setSpaceType(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
              >
                {SPACE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="space-area">
                Área em m²{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id="space-area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 12,5"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="space-priority">Prioridade</Label>
              <select
                id="space-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as ProjectSpacePriority)
                }
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="essential">Essencial</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="space-status">Estado</Label>
              <select
                id="space-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProjectSpaceStatus)
                }
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm"
              >
                <option value="incomplete">Em definição</option>
                <option value="defined">Definido</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="space-notes">
              Observações{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="space-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={3000}
              rows={4}
            />
          </div>
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
            ) : space ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {space ? "Salvar alterações" : "Criar ambiente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function spaceTypeLabel(value: string) {
  return SPACE_TYPES.find((item) => item.value === value)?.label ?? "Outro";
}

function formatArea(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}
