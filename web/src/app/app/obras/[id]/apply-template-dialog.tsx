"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { applyTemplateAction } from "./actions";
import type { StageTemplate } from "@/lib/queries/stage-templates";
import { useBusinessVocabulary } from "@/components/business-segment-context";

interface ApplyTemplateDialogProps {
  projectId: string;
  templates: StageTemplate[];
  trigger?: React.ReactNode;
}

export function ApplyTemplateDialog({
  projectId,
  templates,
  trigger,
}: ApplyTemplateDialogProps) {
  const vocabulary = useBusinessVocabulary();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(
    templates.find((t) => t.is_system)?.id ?? templates[0]?.id ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply() {
    if (!templateId) {
      setError("Escolha um template.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await applyTemplateAction(projectId, templateId);
      if (!r.ok) {
        setError(r.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <LayoutTemplate className="h-4 w-4" />
            Aplicar template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aplicar template de etapas</DialogTitle>
          <DialogDescription>
            As etapas do template serão adicionadas{" "}
            {vocabulary.projectSingular === "Projeto"
              ? "ao projeto"
              : "à obra"}{" "}
            na ordem padrão. Você pode editar, reordenar ou apagar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="apply-tpl">
            Template
          </label>
          <select
            id="apply-tpl"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={pending}
            className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.is_system ? "Modelo: " : "Meu: "}
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={apply} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Aplicar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
