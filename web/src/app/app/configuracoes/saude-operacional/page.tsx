import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Clock3,
  CloudOff,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { cn } from "@/lib/utils";
import { requireOperationalAdmin } from "@/lib/operations/operational-admin";
import { loadOperationalHealthDashboard } from "@/lib/operations/health-dashboard";
import type {
  OperationalDashboardState,
  OperationalHealthViewModel,
  OperationalIncidentViewModel,
} from "@/lib/operations/health-dashboard-core";

export const metadata = {
  title: "Saúde operacional — Prumo",
};

export const dynamic = "force-dynamic";

const STATE_COPY: Record<
  OperationalDashboardState,
  {
    label: string;
    title: string;
    detail: string;
    icon: typeof Activity;
    className: string;
    iconClassName: string;
  }
> = {
  healthy: {
    label: "Saudável",
    title: "Nenhuma falha operacional aberta",
    detail: "O monitor concluiu no prazo e não encontrou incidentes ativos.",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-50",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    label: "Atenção",
    title: "Há um sinal que precisa ser acompanhado",
    detail: "Confira os itens abaixo e o email operacional antes de escalar vendas.",
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-50",
    iconClassName: "text-amber-700 dark:text-amber-300",
  },
  critical: {
    label: "Crítico",
    title: "Há uma falha que exige verificação agora",
    detail: "Revise o alerta operacional e confirme os estados antes de intervir.",
    icon: ShieldAlert,
    className:
      "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-50",
    iconClassName: "text-red-700 dark:text-red-300",
  },
  checking: {
    label: "Verificando",
    title: "O monitor está executando agora",
    detail: "Aguarde a conclusão antes de interpretar o estado geral.",
    icon: LoaderCircle,
    className:
      "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/25 dark:text-sky-50",
    iconClassName: "text-sky-700 motion-safe:animate-spin dark:text-sky-300",
  },
  unknown: {
    label: "Sem evidência",
    title: "Ainda não existe uma verificação registrada",
    detail: "Confirme o cron da Vercel antes de considerar a operação monitorada.",
    icon: CircleHelp,
    className:
      "border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-50",
    iconClassName: "text-slate-600 dark:text-slate-300",
  },
  unavailable: {
    label: "Indisponível",
    title: "Não foi possível consultar a saúde do Prumo",
    detail: "Use o email operacional e os logs da Vercel enquanto a leitura é restabelecida.",
    icon: CloudOff,
    className:
      "border-slate-300 bg-slate-100 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50",
    iconClassName: "text-slate-600 dark:text-slate-300",
  },
};

export default async function OperationalHealthPage() {
  await requireOperationalAdmin();
  const health = await loadOperationalHealthDashboard();
  const copy = stateCopyFor(health);
  const StateIcon = copy.icon;

  return (
    <PageContainer size="medium" spacing="compact">
      <PageHeader
        title="Saúde do Prumo"
        description="Leitura privada dos fluxos que protegem vendas, pagamentos e dados oficiais."
        actions={
          <Button asChild variant="outline">
            <Link href="/app/configuracoes">
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <section
        className={cn("rounded-lg border p-4 sm:p-5", copy.className)}
        aria-labelledby="operational-state-title"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-current/15 bg-white/60 dark:bg-black/10">
            <StateIcon
              aria-hidden="true"
              className={cn("h-5 w-5", copy.iconClassName)}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase text-current/70">
              {copy.label}
            </div>
            <h2
              id="operational-state-title"
              className="mt-1 text-pretty text-lg font-bold leading-6 sm:text-xl"
            >
              {copy.title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-current/80">
              {copy.detail}
            </p>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          icon={Clock3}
          label="Última verificação"
          value={lastRunLabel(health)}
          detail={health.lastRun ? relativeAge(health.lastRun.ageMinutes) : "Sem registro"}
        />
        <Metric
          icon={BellRing}
          label="Alertas enviados"
          value={String(health.lastRun?.alertCount ?? 0)}
          detail="Na última execução"
        />
        <Metric
          icon={ShieldAlert}
          label="Críticos abertos"
          value={String(health.openCounts.critical)}
          detail="Exigem verificação"
          valueClassName={health.openCounts.critical > 0 ? "text-red-700 dark:text-red-300" : undefined}
        />
        <Metric
          icon={AlertTriangle}
          label="Avisos abertos"
          value={String(health.openCounts.warning)}
          detail="Precisam acompanhamento"
          valueClassName={health.openCounts.warning > 0 ? "text-amber-700 dark:text-amber-300" : undefined}
        />
      </dl>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div>
            <h2 className="font-bold">Incidentes abertos</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {health.openCounts.total === 0
                ? "Nenhum item exige acompanhamento agora."
                : openIncidentLabel(health.openCounts.total)}
            </p>
          </div>
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground">
            {health.openCounts.total}
          </span>
        </div>

        {health.incidents.length > 0 ? (
          <div className="divide-y">
            {health.incidents.map((incident, index) => (
              <IncidentRow
                key={`${incident.area}-${incident.firstSeenAt}-${index}`}
                incident={incident}
              />
            ))}
          </div>
        ) : (
          <EmptyState state={health.state} />
        )}

        {health.hasMoreIncidents && (
          <div className="border-t bg-muted/25 px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-5">
            A lista mostra os 20 itens mais importantes. Consulte o email
            operacional para o resumo completo.
          </div>
        )}
      </section>

      <footer className="flex flex-col gap-1 border-t pt-3 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Somente leitura. Nenhum pagamento ou plano é alterado aqui.</span>
        <time dateTime={health.generatedAt}>
          Página atualizada em {formatDateTime(health.generatedAt)}
        </time>
      </footer>
    </PageContainer>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  valueClassName,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3 sm:p-4">
      <dt className="flex min-w-0 items-center gap-2 text-xs font-semibold leading-4 text-muted-foreground">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </dt>
      <dd className={cn("mt-2 text-xl font-bold tabular-nums", valueClassName)}>
        {value}
      </dd>
      <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
        {detail}
      </div>
    </div>
  );
}

function IncidentRow({ incident }: { incident: OperationalIncidentViewModel }) {
  const critical = incident.severity === "critical";
  const Icon = critical ? ShieldAlert : AlertTriangle;

  return (
    <article className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:px-5">
      <div className="flex min-w-0 gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            critical
              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-5">{incident.area}</h3>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-bold",
                critical
                  ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
              )}
            >
              {critical ? "Crítico" : "Atenção"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {incident.summary}
          </p>
          <p className="mt-2 text-xs leading-5 text-foreground/80">
            {incident.action}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-1 sm:text-right">
        <div>
          <dt className="text-muted-foreground">Último sinal</dt>
          <dd className="mt-0.5 font-semibold">
            <time dateTime={incident.lastSeenAt}>
              {formatCompactDateTime(incident.lastSeenAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ocorrências</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">
            {incident.occurrenceCount}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function EmptyState({ state }: { state: OperationalDashboardState }) {
  const healthy = state === "healthy";
  const Icon = healthy ? CheckCircle2 : CircleHelp;

  return (
    <div className="flex items-start gap-3 px-4 py-5 sm:px-5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          healthy
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div>
        <h3 className="font-semibold">
          {healthy ? "Operação sem incidentes" : "Nenhum incidente disponível"}
        </h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {healthy
            ? "O último monitor não deixou pendências abertas."
            : "Use o estado geral acima para decidir a próxima verificação."}
        </p>
      </div>
    </div>
  );
}

function stateCopyFor(health: OperationalHealthViewModel) {
  const copy = STATE_COPY[health.state];
  if (health.freshness === "stale") {
    return {
      ...copy,
      title: "O monitor não concluiu nas últimas 48 horas",
      detail: "Confira o Cron Job e os logs da Vercel antes de confiar no último estado.",
    };
  }
  if (health.freshness === "late") {
    return {
      ...copy,
      title: "O monitor está atrasado",
      detail: "A última conclusão passou de 36 horas. Acompanhe a próxima execução.",
    };
  }
  return copy;
}

function lastRunLabel(health: OperationalHealthViewModel) {
  if (!health.lastRun) return "--";
  return formatCompactDateTime(health.lastRun.checkedAt);
}

function relativeAge(minutes: number) {
  if (!Number.isFinite(minutes) || minutes === Number.MAX_SAFE_INTEGER) {
    return "Horário inválido";
  }
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Há ${days} ${days === 1 ? "dia" : "dias"}`;
}

function openIncidentLabel(count: number) {
  return count === 1
    ? "1 item sob acompanhamento."
    : `${count} itens sob acompanhamento.`;
}

function formatCompactDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
