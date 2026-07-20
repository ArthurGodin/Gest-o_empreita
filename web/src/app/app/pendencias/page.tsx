import Link from "next/link";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { PendencyRow } from "@/components/pendencies/pendency-row";
import { PendencyCenterTracker } from "@/components/pendencies/pendency-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PENDENCY_CATEGORIES,
  isOperationalPendencyCategory,
  type OperationalPendencyCategory,
} from "@/lib/operational-pendencies-core";
import { getOperationalPendencies } from "@/lib/queries/operational-pendencies";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pendências — Prumo",
};

const CATEGORY_LABEL: Record<OperationalPendencyCategory | "all", string> = {
  all: "Todas",
  quotes: "Orçamentos",
  projects: "Obras",
  billing: "Cobranças",
};

export default async function PendenciesPage({
  searchParams,
}: {
  searchParams?: Promise<{ categoria?: string }>;
}) {
  const params = await searchParams;
  const category = isOperationalPendencyCategory(params?.categoria)
    ? params.categoria
    : "all";
  const pendencies = await getOperationalPendencies();
  const filtered =
    category === "all"
      ? pendencies
      : pendencies.filter((pendency) => pendency.category === category);

  return (
    <PageContainer size="medium" spacing="compact">
      <PendencyCenterTracker category={category} count={filtered.length} />
      <PageHeader
        title="Pendências"
        description={
          pendencies.length === 0
            ? "Sua operação não tem pendências objetivas agora."
            : `${pendencies.length} ${pendencies.length === 1 ? "situação exige" : "situações exigem"} sua atenção.`
        }
      />

      <nav
        aria-label="Filtrar pendências"
        className="flex flex-wrap gap-2"
      >
        {(["all", ...PENDENCY_CATEGORIES] as const).map((item) => {
          const active = category === item;
          const count =
            item === "all"
              ? pendencies.length
              : pendencies.filter((pendency) => pendency.category === item).length;
          const href =
            item === "all" ? "/app/pendencias" : `/app/pendencias?categoria=${item}`;

          return (
            <Link
              key={item}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:border-slate-400 hover:text-foreground",
              )}
            >
              {CATEGORY_LABEL[item]}
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <Card className="min-w-0">
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <div className="divide-y" data-testid="pendency-list">
              {filtered.map((pendency) => (
                <PendencyRow key={pendency.id} pendency={pendency} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-base font-semibold">
                {pendencies.length === 0
                  ? "Nenhuma pendência objetiva"
                  : `Nenhuma pendência em ${CATEGORY_LABEL[category]}`}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                O Prumo atualiza esta lista automaticamente quando cobranças,
                prazos e propostas mudam.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                {category !== "all" ? (
                  <Button asChild variant="outline">
                    <Link href="/app/pendencias">Ver todas</Link>
                  </Button>
                ) : null}
                <Button asChild variant="ghost">
                  <Link href="/ajuda">
                    <LifeBuoy aria-hidden="true" />
                    Central de Ajuda
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
