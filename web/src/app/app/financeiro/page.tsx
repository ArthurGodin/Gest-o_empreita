import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  FileCheck2,
  HardHat,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFinanceOverview } from "@/lib/queries/finance";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type {
  ChargeKind,
  ChargeStatus,
  CostCategory,
  ProjectStatus,
} from "@/lib/supabase/types";
import { ExportButton } from "./export-button";

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

const CHARGE_KIND_LABEL: Record<ChargeKind, string> = {
  entrada: "Entrada",
  saldo: "Saldo",
};

const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  draft: "Pix não gerado",
  pending: "Pendente",
  overdue: "Atrasada",
  received: "Recebida",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export const metadata = {
  title: "Financeiro - Prumo",
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
    <div className="container max-w-6xl space-y-5 py-5 sm:space-y-6 sm:py-6">
      <PageHeader
        title="Financeiro"
        description="Uma leitura simples do dinheiro que entrou no papel, do que já virou gasto e da margem estimada."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton />
            <Button asChild>
              <Link href="/app/orcamentos/novo">
                Novo orçamento
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric
          icon={<FileCheck2 className="h-4 w-4" />}
          label="Recebido Pix"
          value={formatBRL(overview.received_charge_cents / 100)}
          hint="Cobranças recebidas ou confirmadas"
          tone="green"
        />
        <FinanceMetric
          icon={<Banknote className="h-4 w-4" />}
          label="A receber"
          value={formatBRL(overview.pending_charge_cents / 100)}
          hint="Pix pendente ou ainda não gerado"
          tone="blue"
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
          tone={overview.margin_cents < 0 ? "red" : "amber"}
        />
        <FinanceMetric
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Atrasado"
          value={formatBRL(overview.overdue_charge_cents / 100)}
          hint="Cobranças vencidas sem baixa"
          tone={overview.overdue_charge_cents > 0 ? "red" : "neutral"}
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

      <Card className="min-w-0 rounded-lg bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Cobranças recentes</CardTitle>
          <span className="text-xs text-muted-foreground">
            {overview.charge_rows.length} registro
            {overview.charge_rows.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent>
          {overview.charge_rows.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Nenhuma cobrança criada ainda. Quando um orçamento aprovado virar
              obra, as parcelas aparecem aqui.
            </div>
          ) : (
            <div className="min-w-0 divide-y rounded-lg border">
              {overview.charge_rows.slice(0, 10).map((charge) => (
                <Link
                  key={charge.id}
                  href={`/app/obras/${charge.project_id}`}
                  className="grid min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-accent md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {CHARGE_KIND_LABEL[charge.kind]}
                      </span>
                      <span className="truncate font-medium">
                        {charge.project_name ?? "Obra sem nome"}
                      </span>
                      <span className={chargeStatusClass(charge.status)}>
                        {CHARGE_STATUS_LABEL[charge.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {charge.customer_name ?? "Cliente não informado"}
                      {charge.due_date ? (
                        <span> - vence em {formatDateBR(charge.due_date)}</span>
                      ) : null}
                      {charge.paid_at ? (
                        <span> - pago em {formatDateBR(charge.paid_at)}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-left text-sm font-semibold md:min-w-32 md:text-right">
                    {formatBRL(charge.amount_cents / 100)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="min-w-0 rounded-lg bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Margem por obra</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/obras">Ver obras</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {overview.project_rows.length === 0 ? (
              <EmptyFinanceState />
            ) : (
              <div className="min-w-0 divide-y rounded-lg border">
                {overview.project_rows.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/obras/${project.id}`}
                    className="grid min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-accent md:grid-cols-[minmax(0,1fr)_auto]"
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
                    <div className="grid min-w-0 grid-cols-1 gap-2 text-sm min-[420px]:grid-cols-3 md:min-w-[380px] md:gap-3">
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
          <Card className="min-w-0 rounded-lg bg-white shadow-sm">
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

          <Card className="min-w-0 rounded-lg bg-white shadow-sm">
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
    blue: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="min-w-0 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`rounded-md p-2 ${toneClass}`}>{icon}</span>
      </div>
      <div className="mt-3 break-words text-xl font-semibold tracking-normal text-slate-950 sm:text-2xl">
        {value}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function chargeStatusClass(status: ChargeStatus) {
  const base = "rounded-md px-2 py-1 text-xs";
  if (status === "received" || status === "confirmed") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }
  if (status === "overdue") {
    return `${base} bg-red-50 text-red-700`;
  }
  if (status === "pending") {
    return `${base} bg-emerald-50 text-emerald-700`;
  }
  return `${base} bg-muted text-muted-foreground`;
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


