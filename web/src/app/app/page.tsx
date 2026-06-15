import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  HardHat,
  Plus,
  Rocket,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  getBillingCharges,
  type BillingChargeListItem,
} from "@/lib/queries/billing-charges";
import { getCustomers } from "@/lib/queries/customers";
import { getProjects } from "@/lib/queries/projects";
import { getQuotes } from "@/lib/queries/quotes";
import {
  getActiveCompanyFull,
  type CompanyFull,
} from "@/lib/queries/company-settings";
import { todayBR } from "@/lib/dates";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/quote-status";
import type { ProjectStatus } from "@/lib/supabase/types";

const OPEN_PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "in_progress",
  "paused",
];
const PAID_CHARGE_STATUSES = new Set(["received", "confirmed"]);

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default async function DashboardPage() {
  const [quotes, projects, customers, charges, company] = await Promise.all([
    getQuotes(),
    getProjects(),
    getCustomers(),
    getBillingCharges(),
    getActiveCompanyFull(),
  ]);
  const paymentReady = isCompanyPaymentReady(company);

  const today = todayBR();
  const pendingQuotes = quotes.filter(
    (quote) =>
      quote.effective_status === "sent" ||
      quote.effective_status === "viewed",
  );
  const draftQuotes = quotes.filter((quote) => quote.status === "draft");
  const approvedWithoutProject = quotes.filter(
    (quote) => quote.effective_status === "approved" && !quote.project_id,
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

  const nextActions = buildNextActions({
    paymentReady,
    customersCount: customers.length,
    pendingQuotes,
    draftQuotes,
    approvedWithoutProject,
    openProjects,
  });
  const firstMoneySteps = buildFirstMoneySteps({
    company,
    customersCount: customers.length,
    quotes,
    projects,
    charges,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <PageHeader
        title="Início"
        description="O caminho mais curto para vender, executar e receber."
        actions={
          <Button asChild>
            <Link href="/app/orcamentos/novo">
              <Plus className="h-4 w-4" />
              Novo orçamento
            </Link>
          </Button>
        }
      />

      <FirstMoneyGuide steps={firstMoneySteps} />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile
          icon={<Send className="h-4 w-4" />}
          label="Esperando cliente"
          value={pendingQuotes.length.toString()}
          hint="Orçamentos enviados ou vistos"
          tone="amber"
        />
        <MetricTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Aprovado no mês"
          value={formatBRL(approvedValueThisMonth / 100)}
          hint={`${approvedThisMonth.length} orçamento${
            approvedThisMonth.length === 1 ? "" : "s"
          } aprovado${approvedThisMonth.length === 1 ? "" : "s"}`}
          tone="green"
        />
        <MetricTile
          icon={<HardHat className="h-4 w-4" />}
          label="Obras abertas"
          value={openProjects.length.toString()}
          hint={
            lateProjects.length > 0
              ? `${lateProjects.length} com prazo estourado`
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
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <Card className="min-w-0 rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Próximas ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextActions.map((action) => (
              <Link
                key={action.href + action.title}
                href={action.href}
                className="group flex items-center justify-between rounded-lg border bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {action.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-5">
                      {action.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {action.detail}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-lg">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Obras abertas</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/obras">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {openProjects.length === 0 ? (
              <EmptyLine
                title="Nenhuma obra aberta"
                detail="Quando um orçamento for aprovado, transforme em obra para acompanhar prazo, fotos e gastos."
                href="/app/orcamentos"
                action="Ver orçamentos"
              />
            ) : (
              <div className="divide-y rounded-lg border">
                {openProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/obras/${project.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {project.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{project.customer?.name ?? "Sem cliente"}</span>
                        <span>•</span>
                        <span>{PROJECT_STATUS_LABEL[project.status]}</span>
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

      <Card className="min-w-0 rounded-lg">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Orçamentos recentes</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/orcamentos">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <EmptyLine
              title="Nenhum orçamento criado"
              detail="O primeiro orçamento é o caminho mais curto para o cliente sentir profissionalismo."
              href="/app/orcamentos/novo"
              action="Criar orçamento"
            />
          ) : (
            <div className="divide-y rounded-lg border">
              {quotes.slice(0, 5).map((quote) => (
                <Link
                  key={quote.id}
                  href={`/app/orcamentos/${quote.id}`}
                  className="grid gap-2 px-4 py-3 transition-colors hover:bg-accent md:grid-cols-[1fr_auto_auto] md:items-center"
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
    </div>
  );
}

interface FirstMoneyStep {
  title: string;
  detail: string;
  href: string;
  action: string;
  done: boolean;
}

function FirstMoneyGuide({ steps }: { steps: FirstMoneyStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done) ?? steps.at(-1);
  const progressPct = Math.round((doneCount / steps.length) * 100);

  if (!nextStep) return null;

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Rocket className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-base font-semibold">
                    Roteiro para receber a primeira entrada
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Um caminho guiado para sair da proposta enviada até a
                    primeira entrada registrada no financeiro.
                  </p>
                </div>
              </div>
            </div>
            <span className="w-fit rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {doneCount}/{steps.length} concluído
            </span>
          </div>

          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {steps.map((step, index) => (
              <Link
                key={step.title}
                href={step.href}
                className={`min-h-[104px] rounded-lg border px-3 py-3 transition-colors hover:border-primary/40 hover:bg-accent ${
                  step.done ? "bg-primary/5" : "bg-background"
                }`}
              >
                <span className="flex items-start gap-2">
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase leading-4 text-muted-foreground">
                      Passo {index + 1}
                    </span>
                    <span className="block text-sm font-medium leading-5">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {step.detail}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="border-t bg-[#fff7ed] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2f8f4e]" />
            <div>
              <p className="text-sm font-semibold">Próxima melhor ação</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {nextStep.title}: {nextStep.detail}
              </p>
            </div>
          </div>
          <Button asChild className="mt-4 w-full">
            <Link href={nextStep.href}>
              {nextStep.action}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Quando esses passos ficam verdes, o app já provou valor: proposta
            enviada, aceite registrado e primeira entrada no controle.
          </p>
        </aside>
      </div>
    </section>
  );
}

function MetricTile({
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
    <div className="rounded-lg border border-dashed px-4 py-5">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="w-fit rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function buildNextActions({
  paymentReady,
  customersCount,
  pendingQuotes,
  draftQuotes,
  approvedWithoutProject,
  openProjects,
}: {
  paymentReady: boolean;
  customersCount: number;
  pendingQuotes: Array<{ id: string; title: string }>;
  draftQuotes: Array<{ id: string; title: string }>;
  approvedWithoutProject: Array<{ id: string; title: string }>;
  openProjects: Array<{ id: string; name: string }>;
}) {
  const actions: Array<{
    href: string;
    title: string;
    detail: string;
    icon: ReactNode;
  }> = [];

  if (!paymentReady) {
    actions.push({
      href: "/app/configuracoes",
      title: "Configurar recebimento",
      detail: "Cadastre a chave Pix antes da primeira entrada.",
      icon: <ShieldCheck className="h-4 w-4" />,
    });
  }

  if (customersCount === 0) {
    actions.push({
      href: "/app/clientes/novo",
      title: "Cadastrar primeiro cliente",
      detail: "Tenha nome e WhatsApp prontos para enviar a proposta.",
      icon: <Users className="h-4 w-4" />,
    });
  }

  const pending = pendingQuotes[0];
  if (pending) {
    actions.push({
      href: `/app/orcamentos/${pending.id}`,
      title: "Acompanhar orçamento enviado",
      detail: pending.title,
      icon: <Clock3 className="h-4 w-4" />,
    });
  }

  const approved = approvedWithoutProject[0];
  if (approved) {
    actions.push({
      href: `/app/orcamentos/${approved.id}`,
      title: "Transformar aprovado em obra",
      detail: approved.title,
      icon: <HardHat className="h-4 w-4" />,
    });
  }

  const draft = draftQuotes[0];
  if (draft) {
    actions.push({
      href: `/app/orcamentos/${draft.id}`,
      title: "Finalizar rascunho",
      detail: draft.title,
      icon: <FileText className="h-4 w-4" />,
    });
  }

  const openProject = openProjects[0];
  if (openProject) {
    actions.push({
      href: `/app/obras/${openProject.id}`,
      title: "Atualizar obra em andamento",
      detail: openProject.name,
      icon: <HardHat className="h-4 w-4" />,
    });
  }

  if (actions.length === 0) {
    actions.push({
      href: "/app/orcamentos/novo",
      title: "Criar primeiro orçamento",
      detail: "Comece pelo que o cliente precisa aprovar.",
      icon: <Plus className="h-4 w-4" />,
    });
  }

  return actions.slice(0, 4);
}

function buildFirstMoneySteps({
  company,
  customersCount,
  quotes,
  projects,
  charges,
}: {
  company: CompanyFull | null;
  customersCount: number;
  quotes: Array<{
    id: string;
    title: string;
    status: string;
    effective_status: string;
    project_id: string | null;
    sent_at: string | null;
    viewed_at: string | null;
    approved_at: string | null;
  }>;
  projects: Array<{ id: string }>;
  charges: BillingChargeListItem[];
}): FirstMoneyStep[] {
  const firstQuote = quotes[0];
  const firstDraft = quotes.find((quote) => quote.status === "draft");
  const firstShared = quotes.find(
    (quote) =>
      quote.sent_at ||
      quote.viewed_at ||
      quote.approved_at ||
      quote.effective_status === "sent" ||
      quote.effective_status === "viewed" ||
      quote.effective_status === "approved",
  );
  const firstApproved = quotes.find(
    (quote) => quote.effective_status === "approved",
  );
  const firstProject =
    (firstApproved?.project_id
      ? projects.find((project) => project.id === firstApproved.project_id)
      : null) ?? projects[0];
  const entryCharge =
    (firstProject
      ? charges.find(
          (charge) =>
            charge.project_id === firstProject.id && charge.kind === "entrada",
        )
      : null) ?? charges.find((charge) => charge.kind === "entrada");
  const entryPaid = entryCharge
    ? PAID_CHARGE_STATUSES.has(entryCharge.status)
    : false;
  const entryChargeHref = firstProject
    ? `/app/obras/${firstProject.id}`
    : firstApproved
      ? `/app/orcamentos/${firstApproved.id}`
      : "/app/orcamentos";
  const entryStep = buildEntryStep({
    projectId: firstProject?.id ?? null,
    charge: entryCharge ?? null,
    fallbackHref: entryChargeHref,
    paid: entryPaid,
  });
  const paymentReady = isCompanyPaymentReady(company);

  return [
    {
      title: "Recebimento",
      detail: paymentReady
        ? "Pix pronto para cobrar."
        : "Configure Pix primeiro.",
      href: "/app/configuracoes",
      action: paymentReady ? "Revisar recebimento" : "Configurar Pix",
      done: paymentReady,
    },
    {
      title: "Cliente",
      detail: "Quem recebe a proposta.",
      href: customersCount > 0 ? "/app/clientes" : "/app/clientes/novo",
      action: "Cadastrar cliente",
      done: customersCount > 0,
    },
    {
      title: "Orçamento",
      detail: "Itens, prazo e total.",
      href: firstQuote ? `/app/orcamentos/${firstQuote.id}` : "/app/orcamentos/novo",
      action: firstDraft
        ? "Finalizar orçamento"
        : firstQuote
          ? "Abrir orçamento"
          : "Criar orçamento",
      done: quotes.length > 0,
    },
    {
      title: "Link",
      detail: "Envio pelo WhatsApp.",
      href: firstShared
        ? `/app/orcamentos/${firstShared.id}`
        : firstQuote
          ? `/app/orcamentos/${firstQuote.id}`
          : "/app/orcamentos/novo",
      action: "Enviar link ao cliente",
      done: Boolean(firstShared),
    },
    {
      title: "Aprovação",
      detail: "Aceite registrado.",
      href: firstApproved
        ? `/app/orcamentos/${firstApproved.id}`
        : firstShared
          ? `/app/orcamentos/${firstShared.id}`
          : "/app/orcamentos",
      action: "Acompanhar aprovação",
      done: Boolean(firstApproved),
    },
    {
      title: "Obra",
      detail: "Execução criada.",
      href: firstProject
        ? `/app/obras/${firstProject.id}`
        : firstApproved
          ? `/app/orcamentos/${firstApproved.id}`
          : "/app/orcamentos",
      action: firstProject ? "Abrir obra" : "Transformar em obra",
      done: Boolean(firstProject),
    },
    {
      title: "Entrada",
      detail: entryStep.detail,
      href: entryStep.href,
      action: entryStep.action,
      done: entryPaid,
    },
  ];
}

function isCompanyPaymentReady(company: CompanyFull | null): boolean {
  if (!company) return false;
  if (company.payment_provider === "asaas") return true;
  return Boolean(
    company.pix_key_type &&
      company.pix_key?.trim() &&
      company.pix_receiver_name?.trim() &&
      company.pix_receiver_city?.trim(),
  );
}

function buildEntryStep({
  projectId,
  charge,
  fallbackHref,
  paid,
}: {
  projectId: string | null;
  charge: BillingChargeListItem | null;
  fallbackHref: string;
  paid: boolean;
}) {
  if (!projectId) {
    return {
      detail: "Primeiro transforme o aprovado em obra.",
      href: fallbackHref,
      action: "Transformar em obra",
    };
  }

  const projectHref = `/app/obras/${projectId}`;

  if (!charge || charge.status === "draft") {
    return {
      detail: "Gere o Pix e envie no WhatsApp.",
      href: projectHref,
      action: "Gerar Pix da entrada",
    };
  }

  if (paid) {
    return {
      detail: "Pagamento confirmado no financeiro.",
      href: "/app/financeiro",
      action: "Ver financeiro",
    };
  }

  if (charge.status === "overdue") {
    return {
      detail: "Entrada atrasada. Reenvie a cobrança.",
      href: projectHref,
      action: "Revisar cobrança",
    };
  }

  if (charge.status === "cancelled") {
    return {
      detail: "Cobrança cancelada. Gere outra.",
      href: projectHref,
      action: "Gerar nova entrada",
    };
  }

  return {
    detail: "Pix gerado, aguardando confirmação.",
    href: projectHref,
    action: "Acompanhar cobrança",
  };
}

function isSameBrazilMonth(value: string): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(new Date(value)) === formatter.format(new Date());
}
