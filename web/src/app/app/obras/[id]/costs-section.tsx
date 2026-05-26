"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { CostCategory } from "@/lib/supabase/types";
import type {
  CostSummary,
  ProjectCost,
  ProjectStage,
} from "@/lib/queries/projects";
import { CostForm } from "./cost-form";
import { deleteCostAction } from "./actions";

interface CostsSectionProps {
  projectId: string;
  costs: ProjectCost[];
  summary: CostSummary;
  stages: ProjectStage[];
}

const CATEGORY_LABEL: Record<CostCategory, string> = {
  material: "Material",
  labor: "MO (Mão de obra)",
  freight: "Frete",
  other: "Outros",
};

const CATEGORY_ORDER: CostCategory[] = ["material", "labor", "freight", "other"];

export function CostsSection({
  projectId,
  costs,
  summary,
  stages,
}: CostsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const stageById = new Map(stages.map((s) => [s.id, s] as const));

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Custos da obra
        </div>
        <span className="text-[10px] text-muted-foreground">interno</span>
      </div>

      <MarginCard summary={summary} />

      <div className="mt-3 space-y-1">
        {CATEGORY_ORDER.map((cat) => {
          const cents = summary.by_category[cat];
          if (cents === 0) return null;
          return (
            <div
              key={cat}
              className="flex items-center justify-between border-b py-1.5 text-sm last:border-0"
            >
              <span className="text-xs text-muted-foreground">
                {CATEGORY_LABEL[cat]}
              </span>
              <strong>{formatBRL(cents / 100)}</strong>
            </div>
          );
        })}
        {summary.total_cents > 0 && (
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatBRL(summary.total_cents / 100)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CostForm projectId={projectId} stages={stages} />
        {costs.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Ocultar lançamentos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ver {costs.length} lançamento{costs.length === 1 ? "" : "s"}
              </>
            )}
          </Button>
        )}
      </div>

      {expanded && costs.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-md border bg-muted/10 p-2 text-sm">
          {costs.map((c) => (
            <CostRow
              key={c.id}
              cost={c}
              stageName={c.stage_id ? stageById.get(c.stage_id)?.name : null}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MarginCard({ summary }: { summary: CostSummary }) {
  if (summary.revenue_cents == null) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
        Sem orçamento aprovado vinculado — a margem aparece quando a obra
        vem de um orçamento.
      </div>
    );
  }

  const margin = summary.margin_cents ?? 0;
  const pct = summary.margin_pct ?? 0;
  const positive = margin >= 0;

  const palette = positive
    ? "border-green-300 bg-green-50 dark:border-green-900/60 dark:bg-green-950/30"
    : "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30";
  const textTone = positive
    ? "text-green-900 dark:text-green-100"
    : "text-red-900 dark:text-red-100";

  return (
    <div
      className={`rounded-md border p-3 ${palette}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-[10px] font-semibold ${textTone}`}>
            Margem atual
          </div>
          <div className={`text-xl font-bold ${textTone}`}>
            {positive ? "+" : ""}
            {pct.toFixed(1)}%
          </div>
        </div>
        <div className={`text-right text-[10px] leading-5 ${textTone}`}>
          {formatBRL(summary.revenue_cents / 100)} receita
          <br />
          − {formatBRL(summary.total_cents / 100)} custos
          <br />
          <strong>= {formatBRL(margin / 100)} lucro</strong>
        </div>
      </div>
    </div>
  );
}

function CostRow({
  cost,
  stageName,
}: {
  cost: ProjectCost;
  stageName: string | null | undefined;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function doDelete() {
    setError(null);
    startTransition(async () => {
      const r = await deleteCostAction(cost.id);
      if (!r.ok) {
        setError(r.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-2 border-b py-1.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{cost.description}</div>
        <div className="text-[10px] text-muted-foreground">
          {formatDateBR(cost.incurred_on)} · {CATEGORY_LABEL[cost.category]}
          {stageName && <span> · {stageName}</span>}
        </div>
        {error && <div className="text-[10px] text-destructive">{error}</div>}
      </div>
      <div className="text-sm font-semibold">
        {formatBRL(cost.amount_cents / 100)}
      </div>
      {!confirming ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setConfirming(true)}
          aria-label="Apagar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="destructive"
            onClick={doDelete}
            disabled={pending}
            className="h-7 text-xs"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="h-7 text-xs"
          >
            Não
          </Button>
        </div>
      )}
    </li>
  );
}
