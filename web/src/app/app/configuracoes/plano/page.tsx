import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Check,
  Clock3,
  Crown,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/queries/company";
import {
  getCompanySaasSubscriptionStatus,
  type SaasSubscriptionStatus,
} from "@/lib/asaas/saas-billing";
import {
  formatPlanPrice,
  isPlanAtLeast,
  normalizeAppPlan,
  PLAN_DEFINITIONS,
  PLAN_ORDER,
  type AppPlan,
  type PaidPlan,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import { UpgradeButton } from "./upgrade-button";
import { CancelPlanButton } from "./cancel-plan-button";

const PLAN_SEQUENCE: AppPlan[] = ["free", "pro", "ultimate"];

export default async function PlanPage() {
  const company = await getActiveCompany();
  if (!company) redirect("/login");

  const supabase = createClient();
  const { data: companyData } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", company.company_id)
    .single();

  const currentPlan = normalizeAppPlan(companyData?.plan);
  const currentDefinition = PLAN_DEFINITIONS[currentPlan];
  const subscriptionStatus = await getCompanySaasSubscriptionStatus(
    company.company_id,
  );

  return (
    <PageContainer>
      <PageHeader
        title="Planos e assinatura"
        description="Compare os recursos disponíveis e gerencie sua assinatura pelo Asaas."
        actions={
          <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm font-semibold text-foreground">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
            Plano atual: {currentDefinition.label}
          </div>
        }
      />

      <SubscriptionStatusPanel status={subscriptionStatus} />

      {currentPlan !== "free" && company.role === "owner" ? (
        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Gerenciar assinatura
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              O cancelamento encerra a recorrência e muda a conta para o Grátis
              imediatamente. O cancelamento comum não gera reembolso
              automático, sem prejuízo dos direitos previstos em lei.
            </p>
          </div>
          <CancelPlanButton />
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {PLAN_SEQUENCE.map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            currentPlan={currentPlan}
            subscriptionStatus={subscriptionStatus}
            featured={plan === "pro"}
          />
        ))}
      </section>

    </PageContainer>
  );
}

function PlanCard({
  plan,
  currentPlan,
  subscriptionStatus,
  featured = false,
}: {
  plan: AppPlan;
  currentPlan: AppPlan;
  subscriptionStatus: SaasSubscriptionStatus;
  featured?: boolean;
}) {
  const definition = PLAN_DEFINITIONS[plan];
  const isCurrent = currentPlan === plan;
  const isIncluded = !isCurrent && isPlanAtLeast(currentPlan, plan);
  const canUpgrade = PLAN_ORDER[currentPlan] < PLAN_ORDER[plan] && plan !== "free";
  const hasPendingPaymentLink =
    subscriptionStatus.state === "pending" &&
    subscriptionStatus.checkoutKind === "payment_link";
  const pendingThisPlan =
    hasPendingPaymentLink && subscriptionStatus.targetPlan === plan;
  const Icon = plan === "ultimate" ? Crown : plan === "pro" ? Sparkles : ShieldCheck;

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]",
        featured && "border-slate-900 bg-slate-950 text-white",
      )}
    >
      {featured ? (
        <div className="absolute left-6 top-0 -translate-y-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
          Recomendado
        </div>
      ) : null}

      {isCurrent ? (
        <div className="absolute right-6 top-0 -translate-y-1/2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
          Seu plano
        </div>
      ) : null}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div
            className={cn(
              "mb-3 flex h-9 w-9 items-center justify-center rounded-md",
              featured
                ? "bg-white/10 text-emerald-300"
                : "bg-emerald-50 text-emerald-700",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold">{definition.name}</h2>
          <p
            className={cn(
              "mt-2 min-h-[60px] text-sm leading-5",
              featured ? "text-slate-300" : "text-muted-foreground",
            )}
          >
            {definition.description}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold">
            {formatPlanPrice(plan)}
          </span>
          {plan !== "free" ? (
            <span
              className={cn(
                "mb-1 text-sm font-medium",
                featured ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              /mês
            </span>
          ) : null}
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {definition.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-6">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                featured ? "text-emerald-300" : "text-emerald-600",
              )}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-3">
        {pendingThisPlan && subscriptionStatus.checkoutUrl ? (
          <Button
            asChild
            size="lg"
            className="w-full bg-amber-600 text-white hover:bg-amber-700"
          >
            <a
              href={subscriptionStatus.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Clock3 className="h-5 w-5" />
              Continuar pagamento
              <ExternalLink className="h-5 w-5" />
            </a>
          </Button>
        ) : canUpgrade && hasPendingPaymentLink ? (
          <div
            className={cn(
              "flex h-11 items-center justify-center rounded-md border text-sm font-semibold",
              featured
                ? "border-white/15 bg-white/10 text-white"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            Pagamento pendente
          </div>
        ) : canUpgrade ? (
          <UpgradeButton plan={plan as PaidPlan} />
        ) : (
          <div
            className={cn(
              "flex h-11 items-center justify-center rounded-md border text-sm font-semibold",
              featured
                ? "border-white/15 bg-white/10 text-white"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            {isCurrent
              ? "Plano ativo"
              : isIncluded
                ? "Incluído no seu plano"
                : "Plano em uso"}
          </div>
        )}

        {plan !== "free" && canUpgrade ? (
          <p
            className={cn(
              "text-center text-xs leading-5",
              featured ? "text-slate-400" : "text-muted-foreground",
            )}
          >
            Pagamento seguro via Asaas. Sem fidelidade.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function SubscriptionStatusPanel({
  status,
}: {
  status: SaasSubscriptionStatus;
}) {
  if (status.state === "none") {
    return (
      <StatusCard
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Sem assinatura paga ativa"
        tone="neutral"
        text="A conta esta no Plano Gratis. Quando uma assinatura Pro ou Ultimate for paga no Asaas, o Prumo libera o plano automaticamente."
      />
    );
  }

  if (status.state === "pending") {
    const target = status.targetPlan
      ? PLAN_DEFINITIONS[status.targetPlan].label
      : "plano pago";
    const isPaymentLink = status.checkoutKind === "payment_link";

    return (
      <StatusCard
        icon={<Clock3 className="h-5 w-5" />}
        title={`Aguardando pagamento do ${target}`}
        tone="warning"
        text={
          isPaymentLink
            ? "Existe um link recorrente do Asaas aguardando preenchimento. Ele nao gera boleto ate o cliente escolher boleto dentro do gateway."
            : "Existe uma assinatura antiga gerada pelo fluxo anterior. Ao iniciar o checkout novamente, o Prumo cancela essa pendencia e cria um link novo sem boleto automatico."
        }
        action={
          isPaymentLink && status.checkoutUrl ? (
            <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
              <a href={status.checkoutUrl} target="_blank" rel="noopener noreferrer">
                Abrir pagamento
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null
        }
      />
    );
  }

  if (status.state === "active" || status.state === "active_without_subscription") {
    const plan = PLAN_DEFINITIONS[status.currentPlan].label;
    const text =
      status.state === "active_without_subscription"
        ? "O plano esta liberado no Prumo. Nenhuma cobranca recorrente ativa foi encontrada vinculada aqui."
        : "O plano esta liberado. Pagamentos futuros continuam sendo processados pelo Asaas.";

    return (
      <StatusCard
        icon={<ShieldCheck className="h-5 w-5" />}
        title={`${plan} ativo`}
        tone="success"
        text={text}
      />
    );
  }

  if (status.state === "inactive") {
    return (
      <StatusCard
        icon={<AlertCircle className="h-5 w-5" />}
        title="Assinatura anterior inativa"
        tone="neutral"
        text="A assinatura anterior no Asaas esta inativa. Voce pode gerar uma nova assinatura quando quiser."
      />
    );
  }

  return (
    <StatusCard
      icon={<AlertCircle className="h-5 w-5" />}
      title="Nao foi possivel confirmar a assinatura"
      tone="warning"
      text={
        status.message ??
        "Tente novamente em instantes antes de gerar uma nova cobranca."
      }
    />
  );
}

function StatusCard({
  icon,
  title,
  text,
  tone,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone: "neutral" | "success" | "warning";
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] md:flex-row md:items-center md:justify-between",
        tone === "success" && "border-emerald-200 bg-emerald-50",
        tone === "warning" && "border-amber-200 bg-amber-50",
        tone === "neutral" && "bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            tone === "success" && "bg-emerald-100 text-emerald-700",
            tone === "warning" && "bg-amber-100 text-amber-700",
            tone === "neutral" && "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {text}
          </p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
