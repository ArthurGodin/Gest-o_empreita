import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  FileCheck2,
  HardHat,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFinanceOverview } from "@/lib/queries/finance";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { CostCategory, ProjectStatus } from "@/lib/supabase/types";

const CATEGORY_LABEL: Record<CostCategory, string> = {
  material: "Material",
  labor: "Mão de obra",
  freight: "Frete",
  other: "Outros",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const metadata = {
  title: "Financeiro - Gestão Empreita",
};

export default async function FinanceiroPage() {
  const overview = await getFinanceOverview();
  const marginPct =
    overview.approved_revenue_cents > 0
      ? Math.round(
          (overview.margin_cents / overview.approved_revenue_cents) * 10000,
        ) / 100
      : null;

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <PageHeader
        title="Financeiro"
        description="Uma leitura simples do dinheiro que entrou no papel, do que já virou gasto e da margem estimada."
        actions={
          <Button asChild>
            <Link href="/app/orcamentos/novo">
              Novo orçamento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric
          icon={<FileCheck2 className="h-4 w-4" />}
          label="Aprovado"
          value={formatBRL(overview.approved_revenue_cents / 100)}
          hint="Orçamentos aprovados pelos clientes"
          tone="green"
        />
        <FinanceMetric
          icon={<ReceiptText className="h-4 w-4" />}
          label="Gastos lançados"
          value={formatBRL(overview.cost_cents / 100)}
          hint="Material, mão de obra, frete e outros"
          tone="amber"
        />
        <FinanceMetric
          icon={<TrendingUp className="h-4 w-4" />}
          label="Margem estimada"
          value={formatBRL(overview.margin_cents / 100)}
          hint={
            marginPct == null
              ? "Aparece quando houver aprovados"
              : `${marginPct.toLocaleString("pt-BR")}% sobre aprovados`
          }
          tone={overview.margin_cents < 0 ? "red" : "blue"}
        />
        <FinanceMetric
          icon={<Banknote className="h-4 w-4" />}
          label="Em negociação"
          value={formatBRL(overview.pending_quote_cents / 100)}
          hint="Orçamentos enviados ou vistos"
          tone="neutral"
        />
      </section>

      {overview.approved_without_project_cents > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              Existem aprovados que ainda não viraram obra.
            </p>
            <p>
              {formatBRL(overview.approved_without_project_cents / 100)} já foi
              aprovado pelo cliente. Transforme em obra para controlar custo,
              fotos e margem.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-lg">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Margem por obra</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/obras">Ver obras</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overview.project_rows.length === 0 ? (
              <EmptyFinanceState />
            ) : (
              <div className="divide-y rounded-lg border">
                {overview.project_rows.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/obras/${project.id}`}
                    className="grid gap-3 px-4 py-4 transition-colors hover:bg-accent md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">
                          {project.name}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {STATUS_LABEL[project.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                          {project.customer_name ?? "Cliente não informado"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm md:min-w-[380px]">
                      <MoneyColumn
                        label="Receita"
                        value={project.approved_revenue_cents || project.budget_cents}
                        empty="Sem valor"
                      />
                      <MoneyColumn label="Gasto" value={project.cost_cents} />
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Margem</p>
                        <p
                          className={
                            project.margin_cents != null &&
                            project.margin_cents < 0
                              ? "font-semibold text-red-700"
                              : "font-semibold text-primary"
                          }
                        >
                          {project.margin_cents == null
                            ? "-"
                            : formatBRL(project.margin_cents / 100)}
                        </p>
                        {project.margin_pct != null ? (
                          <p className="text-xs text-muted-foreground">
                            {project.margin_pct.toLocaleString("pt-BR")}%
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base">Gastos por tipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.keys(CATEGORY_LABEL) as CostCategory[]).map((category) => {
                const value = overview.costs_by_category[category];
                const pct =
                  overview.cost_cents > 0
                    ? Math.round((value / overview.cost_cents) * 100)
                    : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{CATEGORY_LABEL[category]}</span>
                      <span className="font-medium">
                        {formatBRL(value / 100)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base">Últimos gastos</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.recent_costs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Lance gastos dentro de uma obra para enxergar a margem real.
                </p>
              ) : (
                <div className="space-y-3">
                  {overview.recent_costs.map((cost) => (
                    <div key={cost.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {cost.description}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {cost.project_name ?? "Obra não encontrada"} -{" "}
                            {formatDateBR(cost.incurred_on)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatBRL(cost.amount_cents / 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function FinanceMetric({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "blue" | "amber" | "green" | "red";
}) {
  const toneClass = {
    neutral: "bg-muted text-foreground",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`rounded-md p-2 ${toneClass}`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-normal">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function MoneyColumn({
  label,
  value,
  empty = formatBRL(0),
}: {
  label: string;
  value: number | null;
  empty?: string;
}) {
  return (
    <div className="text-right">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {value == null ? empty : formatBRL(value / 100)}
      </p>
    </div>
  );
}

function EmptyFinanceState() {
  return (
    <div className="rounded-lg border border-dashed px-4 py-8 text-center">
      <HardHat className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Ainda não há financeiro para ler.</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Crie um orçamento, envie para o cliente e transforme o aprovado em obra.
        Depois lance gastos para acompanhar a margem.
      </p>
      <Button asChild className="mt-4" size="sm">
        <Link href="/app/orcamentos/novo">Criar primeiro orçamento</Link>
      </Button>
    </div>
  );
}
