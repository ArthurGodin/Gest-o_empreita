import Link from "next/link";
import { CheckCircle2, ListChecks } from "lucide-react";
import { PendencyRow } from "@/components/pendencies/pendency-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationalPendency } from "@/lib/operational-pendencies-core";

const SUMMARY_LIMIT = 5;

export function PendencySummary({
  pendencies,
}: {
  pendencies: OperationalPendency[];
}) {
  return (
    <Card className="min-w-0" data-testid="pendency-summary">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-2.5 pl-4 pr-2">
        <div className="flex min-w-0 items-center gap-2">
          <ListChecks aria-hidden="true" className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Pendências</CardTitle>
          {pendencies.length > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-700">
              {pendencies.length}
            </span>
          ) : null}
        </div>
        {pendencies.length > 0 ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/pendencias">Ver todas</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {pendencies.length === 0 ? (
          <div className="flex min-h-24 items-center gap-3 px-4 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Nenhuma pendência objetiva</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Cobranças, prazos e propostas estão sem ação urgente agora.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {pendencies.slice(0, SUMMARY_LIMIT).map((pendency) => (
              <PendencyRow key={pendency.id} pendency={pendency} compact />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
