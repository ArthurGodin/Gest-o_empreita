import Link from "next/link";
import {
  CheckCircle2,
  FolderKanban,
  HardHat,
  Plus,
  Send,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MetricStrip,
  MetricTile,
} from "@/components/app-shell/metric-strip";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { PendencySummary } from "@/components/pendencies/pendency-summary";
import { FirstMoneyGuide } from "./first-money-guide";
import { SampleDataButton } from "./sample-data-button";
import { getBillingCharges } from "@/lib/queries/billing-charges";
import { getCustomers } from "@/lib/queries/customers";
import { getProjects } from "@/lib/queries/projects";
import { getQuotes } from "@/lib/queries/quotes";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import { getDeliverablePendencyInputs } from "@/lib/queries/deliverable-pendencies";
import { buildActivationProgress } from "@/lib/activation/activation-core";
import { todayBR } from "@/lib/dates";
import { buildOperationalPendencies } from "@/lib/operational-pendencies-core";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/quote-status";
import {
  getBusinessVocabulary,
  isProfessionalSegment,
} from "@/lib/business-segment";
import type { ProjectStatus } from "@/lib/supabase/types";

const OPEN_PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "in_progress",
  "paused",
];
const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default async function DashboardPage() {
  const [quotes, projects, customers, charges, company, deliverables] =
    await Promise.all([
    getQuotes({ limit: 300 }),
    getProjects({ limit: 200 }),
    getCustomers(),
    getBillingCharges(),
    getActiveCompanyFull(),
    getDeliverablePendencyInputs(),
  ]);
  const vocabulary = getBusinessVocabulary(company?.business_segment);
  const isProfessional = isProfessionalSegment(company?.business_segment);
  const ProjectIcon = isProfessional ? FolderKanban : HardHat;
  const quoteLower = vocabulary.quoteSingular.toLowerCase();
  const projectLower = vocabulary.projectSingular.toLowerCase();
  const projectStatusLabels: Record<ProjectStatus, string> = isProfessional
    ? {
        planning: "Planejado",
        in_progress: "Em execução",
        paused: "Pausado",
        completed: "Concluído",
        cancelled: "Cancelado",
      }
    : PROJECT_STATUS_LABEL;
  const today = todayBR();
  const pendingQuotes = quotes.filter(
    (quote) =>
      quote.effective_status === "sent" ||
      quote.effective_status === "viewed",
  );
  const openProjects = projects.filter((project) =>
    OPEN_PROJECT_STATUSES.includes(project.status),
  );
  const lateProjects = openProjects.filter(
    (project) => project.ends_on && project.ends_on < today,
  );
  const approvedThisMonth = quotes.filter(
    (quote) =>
      quote.effective_status === "approved" &&
      isSameBrazilMonth(quote.approved_at ?? quote.updated_at),
  );
  const approvedValueThisMonth = approvedThisMonth.reduce(
    (sum, quote) => sum + quote.total_cents,
    0,
  );

  const pendencies = buildOperationalPendencies({
    today,
    quotes,
    projects,
    charges,
    deliverables,
  });
  const activation = buildActivationProgress({
    company,
    customersCount: customers.length,
    quotes,
    projects,
    charges,
  });
  const isEmptyWorkspace =
    customers.length === 0 && quotes.length === 0 && projects.length === 0;

  return (
    <PageContainer>
      <PageHeader
        title="Início"
        description="O caminho mais curto para vender, executar e receber."
        actions={
          <Button asChild>
            <Link href="/app/orcamentos/novo">
              <Plus aria-hidden="true" className="h-4 w-4" />
              {vocabulary.newQuoteLabel}
            </Link>
          </Button>
        }
      />

      {isEmptyWorkspace ? <EmptyWorkspaceCard /> : null}

      <FirstMoneyGuide progress={activation} />

      <MetricStrip ariaLabel="Resumo da operação">
        <MetricTile
          className="border-b border-r xl:border-b-0"
          icon={<Send className="h-4 w-4" />}
          label="Esperando cliente"
          value={pendingQuotes.length.toString()}
          hint={`${vocabulary.quotePlural} ${isProfessional ? "enviadas" : "enviados"} ou ${isProfessional ? "vistas" : "vistos"}`}
          tone="amber"
        />
        <MetricTile
          className="border-b xl:border-b-0 xl:border-r"
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Aprovado no mês"
          value={formatBRL(approvedValueThisMonth / 100)}
          hint={`${approvedThisMonth.length} ${
            approvedThisMonth.length === 1
              ? quoteLower
              : vocabulary.quotePluralLower
          } ${
            approvedThisMonth.length === 1
              ? isProfessional
                ? "aprovada"
                : "aprovado"
              : isProfessional
                ? "aprovadas"
                : "aprovados"
          }`}
          tone="green"
        />
        <MetricTile
          className="border-r xl:border-r"
          icon={<ProjectIcon className="h-4 w-4" />}
          label={`${vocabulary.projectPlural} ${isProfessional ? "abertos" : "abertas"}`}
          value={openProjects.length.toString()}
          hint={
            lateProjects.length > 0
              ? `${lateProjects.length} com prazo estourado`
              : isProfessional
                ? "Planejados, em execução ou pausados"
                : "Planejadas, em execução ou pausadas"
          }
          tone={lateProjects.length > 0 ? "red" : "blue"}
        />
        <MetricTile
          icon={<Users className="h-4 w-4" />}
          label="Clientes"
          value={customers.length.toString()}
          hint="Base cadastrada da empresa"
          tone="neutral"
        />
      </MetricStrip>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <PendencySummary pendencies={pendencies} />

        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-2.5 pl-4 pr-2">
            <CardTitle className="text-base">
              {vocabulary.projectPlural} {isProfessional ? "abertos" : "abertas"}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/obras">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {openProjects.length === 0 ? (
              <EmptyLine
                title={`Nenhum${isProfessional ? "" : "a"} ${projectLower} ${isProfessional ? "aberto" : "aberta"}`}
                detail={`Quando ${isProfessional ? "uma" : "um"} ${quoteLower} for ${isProfessional ? "aprovada" : "aprovado"}, transforme em ${projectLower} para acompanhar prazo, registros e custos.`}
                href="/app/orcamentos"
                action={`Ver ${vocabulary.quotePluralLower}`}
              />
            ) : (
              <div className="divide-y">
                {openProjects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/app/obras/${project.id}`}
                  className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {project.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{project.customer?.name ?? "Sem cliente"}</span>
                        <span>•</span>
                        <span>{projectStatusLabels[project.status]}</span>
                        {project.ends_on ? (
                          <>
                            <span>•</span>
                            <span>Prazo {formatDateBR(project.ends_on)}</span>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      {project.budget_cents == null
                        ? "Sem valor"
                        : formatBRL(project.budget_cents / 100)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="min-w-0">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b py-2.5 pl-4 pr-2">
            <CardTitle className="text-base">
              {vocabulary.quotePlural} recentes
            </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/orcamentos">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {quotes.length === 0 ? (
            <EmptyLine
              title={`Nenhum${isProfessional ? "a" : ""} ${quoteLower} ${isProfessional ? "criada" : "criado"}`}
              detail={`${isProfessional ? "A primeira" : "O primeiro"} ${quoteLower} é o caminho mais curto para o cliente perceber profissionalismo.`}
              href="/app/orcamentos/novo"
              action={`Criar ${quoteLower}`}
            />
          ) : (
            <div className="divide-y">
              {quotes.slice(0, 5).map((quote) => (
                <Link
                  key={quote.id}
                  href={`/app/orcamentos/${quote.id}`}
                  className="grid min-h-16 gap-2 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {quote.number} · {quote.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {quote.customer?.name ?? "Cliente não informado"}
                    </span>
                  </span>
                  <StatusPill label={STATUS_LABEL[quote.effective_status]} />
                  <span className="text-sm font-semibold text-primary md:text-right">
                    {formatBRL(quote.total_cents / 100)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function EmptyWorkspaceCard() {
  return (
    <section className="rounded-lg border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Comece com um cliente real
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
            Cadastre quem receberá sua primeira proposta. O exemplo é opcional e
            fica separado dos seus dados reais.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Button asChild>
            <Link href="/app/clientes/novo">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Cadastrar cliente
            </Link>
          </Button>
          <SampleDataButton />
        </div>
      </div>
    </section>
  );
}


function EmptyLine({
  title,
  detail,
  href,
  action,
}: {
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{detail}</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    Rascunho: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    Enviado: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    Visualizado: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    Aprovado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    Recusado: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    Expirado: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  };
  const cls = colorMap[label] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function isSameBrazilMonth(value: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(new Date(value)) === formatter.format(new Date());
}
