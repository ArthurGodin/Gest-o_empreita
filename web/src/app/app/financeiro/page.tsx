import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  FileCheck2,
  HardHat,
  TrendingUp,
} from "lucide-react";
import {
  MetricStrip,
  MetricTile,
} from "@/components/app-shell/metric-strip";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { normalizeAppPlan } from "@/lib/plans";
import { getActiveCompany } from "@/lib/queries/company";
import { getFinanceOverview } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";
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
  const [overview, activeCompany] = await Promise.all([
    getFinanceOverview(),
    getActiveCompany(),
  ]);
  const supabase = createClient();
  const { data: companyData } = activeCompany
    ? await supabase
        .from("companies")
        .select("plan")
        .eq("id", activeCompany.company_id)
        .single()
    : { data: null };
  const currentPlan = normalizeAppPlan(companyData?.plan);
  const marginPct =
    overview.approved_revenue_cents > 0
      ? Math.round(
          (overview.margin_cents / overview.approved_revenue_cents) * 10000,
        ) / 100
      : null;

  return (
    <PageContainer>
      <PageHeader
        title="Financeiro"
        description="Acompanhe recebimentos, gastos e margem estimada das obras."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportButton currentPlan={currentPlan} />
            <Button asChild>
              <Link href="/app/orcamentos/novo">
                Novo orçamento
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <MetricStrip ariaLabel="Resumo financeiro">
        <MetricTile
          className="border-b border-r xl:border-b-0"
          icon={<FileCheck2 className="h-4 w-4" />}
          label="Recebido Pix"
          value={formatBRL(overview.received_charge_cents / 100)}
          hint="Cobranças recebidas ou confirmadas"
          tone="green"
        />
        <MetricTile
          className="border-b xl:border-b-0 xl:border-r"
          icon={<Banknote className="h-4 w-4" />}
          label="A receber"
          value={formatBRL(overview.pending_charge_cents / 100)}
          hint="Pix pendente ou ainda não gerado"
          tone="blue"
        />
        <MetricTile
          className="border-r xl:border-r"
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
        <MetricTile
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Atrasado"
          value={formatBRL(overview.overdue_charge_cents / 100)}
          hint="Cobranças vencidas sem baixa"
          tone={overview.overdue_charge_cents > 0 ? "red" : "neutral"}
        />
      </MetricStrip>

      {overview.approved_without_project_cents > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
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

      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
          <CardTitle className="text-base">Cobranças recentes</CardTitle>
          <span className="text-xs text-muted-foreground">
            {overview.charge_rows.length} registro
            {overview.charge_rows.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {overview.charge_rows.length === 0 ? (
            <div className="px-4 py-6 text-sm leading-6 text-muted-foreground">
              Nenhuma cobrança criada ainda. Quando um orçamento aprovado virar
              obra, as parcelas aparecem aqui.
            </div>
          ) : (
            <div className="min-w-0 divide-y">
              {overview.charge_rows.slice(0, 10).map((charge) => (
                <Link
                  key={charge.id}
                  href={`/app/obras/${charge.project_id}`}
                  className="grid min-h-16 min-w-0 gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
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
                  <div className="text-left text-sm font-semibold tabular-nums text-slate-950 md:min-w-32 md:text-right">
                    {formatBRL(charge.amount_cents / 100)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-2.5 pl-4 pr-2">
            <CardTitle className="text-base">Margem por obra</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/obras">Ver obras</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {overview.project_rows.length === 0 ? (
              <EmptyFinanceState />
            ) : (
              <div className="min-w-0 divide-y">
                {overview.project_rows.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/obras/${project.id}`}
                    className="grid min-h-20 min-w-0 gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
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
          <Card className="min-w-0">
            <CardHeader className="border-b py-3.5">
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
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="border-b py-3.5">
              <CardTitle className="text-base">Últimos gastos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {overview.recent_costs.length === 0 ? (
                <p className="px-4 py-6 text-sm leading-6 text-muted-foreground">
                  Lance gastos dentro de uma obra para enxergar a margem real.
                </p>
              ) : (
                <div className="divide-y">
                  {overview.recent_costs.map((cost) => (
                    <div key={cost.id} className="px-4 py-3">
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
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
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
    </PageContainer>
  );
}

function chargeStatusClass(status: ChargeStatus) {
  const base = "rounded-md px-2 py-1 text-xs";
  if (status === "received" || status === "confirmed") {
    return `${base} bg-emerald-100 text-emerald-800`;
  }
  if (status === "overdue") {
    return `${base} bg-red-50 text-red-700`;
  }
  if (status === "pending") {
    return `${base} bg-amber-100 text-amber-800`;
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
      <p className="font-semibold tabular-nums">
        {value == null ? empty : formatBRL(value / 100)}
      </p>
    </div>
  );
}

function EmptyFinanceState() {
  return (
    <div className="px-4 py-8 text-center">
      <HardHat aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
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


