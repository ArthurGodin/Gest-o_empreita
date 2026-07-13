"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROJECT_STATUS_LABEL,
  suggestNextStatus,
} from "@/lib/project-status";
import type { ProjectStatus, StageStatus } from "@/lib/supabase/types";
import { updateProjectStatusAction } from "./actions";

interface StatusSuggestionProps {
  projectId: string;
  current: ProjectStatus;
  stages: { status: StageStatus }[];
}

export function StatusSuggestion({
  projectId,
  current,
  stages,
}: StatusSuggestionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const suggestion = suggestNextStatus(current, stages);
  if (!suggestion) return null;

  function accept() {
    if (!suggestion) return;
    startTransition(async () => {
      const r = await updateProjectStatusAction(projectId, suggestion.to);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <div className="flex items-start gap-2 sm:items-center">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span>
          {suggestion.reason} —{" "}
          <strong>marcar obra como {PROJECT_STATUS_LABEL[suggestion.to]}?</strong>
        </span>
      </div>
      <Button size="sm" onClick={accept} disabled={pending} className="self-end sm:self-auto">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Marcar"}
      </Button>
    </div>
  );
}
