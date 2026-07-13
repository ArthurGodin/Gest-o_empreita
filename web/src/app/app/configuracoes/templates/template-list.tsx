"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  StageTemplate,
  StageTemplateItem,
} from "@/lib/queries/stage-templates";
import { TemplateForm } from "./template-form";
import { deleteTemplateAction } from "./actions";

interface TemplateWithItemCount {
  template: StageTemplate;
  items: StageTemplateItem[];
}

interface TemplateListProps {
  templates: TemplateWithItemCount[];
}

type EditState =
  | { mode: "none" }
  | { mode: "creating" }
  | { mode: "editing"; templateId: string };

export function TemplateList({ templates }: TemplateListProps) {
  const router = useRouter();
  const [state, setState] = useState<EditState>({ mode: "none" });
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const customTemplates = templates.filter((t) => !t.template.is_system);
  const systemTemplates = templates.filter((t) => t.template.is_system);

  function doDelete(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      const r = await deleteTemplateAction(id);
      if (!r.ok) {
        setDeleteError(r.error);
      } else {
        setConfirmId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold">Templates de etapas</h2>
          <p className="text-sm text-muted-foreground">
            Crie modelos próprios pra acelerar a abertura de novas obras.
          </p>
        </div>
        {state.mode === "none" && (
          <Button
            onClick={() => setState({ mode: "creating" })}
            disabled={pending}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Novo template
          </Button>
        )}
      </div>

      {state.mode === "creating" && (
        <TemplateForm
          onSaved={() => setState({ mode: "none" })}
          onCancel={() => setState({ mode: "none" })}
        />
      )}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Meus templates
        </h3>
        {customTemplates.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum template customizado ainda.
          </div>
        ) : (
          <ul className="space-y-2">
            {customTemplates.map(({ template, items }) =>
              state.mode === "editing" && state.templateId === template.id ? (
                <li key={template.id}>
                  <TemplateForm
                    templateId={template.id}
                    initialName={template.name}
                    initialDescription={template.description ?? ""}
                    initialItems={items.map((i) => ({
                      name: i.name,
                      est_days: i.est_days,
                    }))}
                    onSaved={() => setState({ mode: "none" })}
                    onCancel={() => setState({ mode: "none" })}
                  />
                </li>
              ) : (
                <li
                  key={template.id}
                  className="flex items-start justify-between gap-3 rounded-md border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground">
                        {template.description}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {items.length} etapa{items.length === 1 ? "" : "s"}
                      {items.length > 0 &&
                        ` · ${items.map((i) => i.name).join(" → ")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setState({ mode: "editing", templateId: template.id })
                      }
                      aria-label="Editar template"
                    className="h-10 w-10"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {confirmId === template.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => doDelete(template.id)}
                          disabled={pending}
                          className="h-10 text-xs"
                        >
                          {pending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Apagar"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmId(null)}
                          disabled={pending}
                          className="h-10 text-xs"
                        >
                          Não
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmId(template.id)}
                        aria-label="Apagar template"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
        {deleteError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Modelos do sistema
        </h3>
        <ul className="space-y-2">
          {systemTemplates.map(({ template, items }) => (
            <li
              key={template.id}
              className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 p-3 opacity-90"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 font-medium">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  {template.name}
                </div>
                {template.description && (
                  <div className="text-xs text-muted-foreground">
                    {template.description}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  {items.length} etapa{items.length === 1 ? "" : "s"} ·{" "}
                  {items.map((i) => i.name).join(" → ")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
