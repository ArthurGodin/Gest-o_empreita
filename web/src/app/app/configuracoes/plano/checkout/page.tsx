import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Crown,
  CreditCard,
  QrCode,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { getActiveCompany, getCurrentUser } from "@/lib/queries/company";
import { isSaasBillingSimulationEnabled } from "@/lib/billing/saas-simulation";
import { getCompanySaasSubscriptionStatus } from "@/lib/asaas/saas-billing";
import {
  formatPlanPrice,
  isPlanAtLeast,
  normalizeAppPlan,
  normalizePaidPlan,
  PLAN_DEFINITIONS,
  type PaidPlan,
} from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "./payment-form";

interface CheckoutPageProps {
  searchParams?: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const query = searchParams ? await searchParams : {};
  const targetPlan: PaidPlan = normalizePaidPlan(query.plan) ?? "pro";
  const targetDefinition = PLAN_DEFINITIONS[targetPlan];

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const active = await getActiveCompany();
  if (!active) redirect("/app");
  if (active.role !== "owner") redirect("/app/configuracoes/plano");

  const supabase = createClient();
  const [{ data: companyRecord }, subscriptionStatus] = await Promise.all([
    supabase
      .from("companies")
      .select("plan")
      .eq("id", active.company_id)
      .single(),
    getCompanySaasSubscriptionStatus(active.company_id),
  ]);

  const currentPlan = normalizeAppPlan(companyRecord?.plan);
  if (isPlanAtLeast(currentPlan, targetPlan)) {
    redirect("/app/configuracoes/plano");
  }

  const Icon = targetPlan === "ultimate" ? Crown : ShieldCheck;
  const simulationEnabled = isSaasBillingSimulationEnabled();
  const pendingSamePlan =
    subscriptionStatus.state === "pending" &&
    subscriptionStatus.targetPlan === targetPlan &&
    subscriptionStatus.checkoutKind === "payment_link"
      ? subscriptionStatus.checkoutUrl
      : null;
  const pendingOtherPlan =
    subscriptionStatus.state === "pending" &&
    subscriptionStatus.targetPlan &&
    subscriptionStatus.targetPlan !== targetPlan &&
    subscriptionStatus.checkoutKind === "payment_link"
      ? PLAN_DEFINITIONS[subscriptionStatus.targetPlan].label
      : null;
  const replacesLegacyPending =
    subscriptionStatus.state === "pending" &&
    subscriptionStatus.checkoutKind === "subscription";

  return (
    <PageContainer className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-5">
          <Button asChild variant="ghost" className="-ml-3 mb-4 text-muted-foreground">
            <Link href="/app/configuracoes/plano">
              <ArrowLeft className="h-4 w-4" />
              Voltar para planos
            </Link>
          </Button>

          <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Assinar {targetDefinition.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Abra o gateway seguro do Asaas para escolher Pix, cartao ou boleto.
            O Prumo nao emite boleto nesta tela; o plano so libera quando o
            pagamento for confirmado pelo Asaas.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <PaymentMethod icon={<QrCode className="h-5 w-5" />} label="Pix" />
            <PaymentMethod
              icon={<CreditCard className="h-5 w-5" />}
              label="Cartao"
            />
            <PaymentMethod
              icon={<Receipt className="h-5 w-5" />}
              label="Boleto"
            />
          </div>

          <div className="mt-5 border-t pt-4">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-semibold">
                  Assinatura mensal, sem fidelidade
                </div>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  O pagamento e processado pelo Asaas. Quando o pagamento for
                  confirmado, o webhook ativa o plano automaticamente.
                </p>
              </div>
            </div>
          </div>

          {pendingSamePlan ? (
            <CheckoutNotice
              icon={<Clock3 className="h-5 w-5" />}
              title="Ja existe pagamento pendente para este plano"
              text="Continue pelo link existente. Assim voce evita outra cobranca ou boleto aparecendo no banco."
            />
          ) : pendingOtherPlan ? (
            <CheckoutNotice
              icon={<AlertCircle className="h-5 w-5" />}
              title={`Existe uma assinatura pendente do ${pendingOtherPlan}`}
              text="Volte para planos e conclua ou cancele essa pendencia antes de gerar uma nova assinatura."
            />
          ) : null}
        </section>

        <aside className="rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-5">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Plano selecionado
              </div>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                {targetDefinition.name}
              </h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                {formatPlanPrice(targetPlan)}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                por mes
              </div>
            </div>
          </div>

          <ul className="my-5 space-y-2.5">
            {targetDefinition.checkoutHighlights.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <PaymentForm
            plan={targetPlan}
            pendingCheckoutUrl={pendingSamePlan}
            pendingOtherPlan={pendingOtherPlan}
            replacesLegacyPending={replacesLegacyPending}
          />

          {simulationEnabled ? (
            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              Modo simulado local ativo. Em producao, o plano so libera apos
              confirmacao de pagamento pelo Asaas.
            </p>
          ) : (
            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              O plano sera liberado automaticamente quando o pagamento for
              confirmado pelo Asaas.
            </p>
          )}
        </aside>
    </PageContainer>
  );
}

function PaymentMethod({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border bg-card p-2.5 text-sm font-semibold">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      {label}
    </div>
  );
}

function CheckoutNotice({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-amber-700">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-amber-950">{title}</div>
          <p className="mt-1 text-sm leading-6 text-amber-900/80">{text}</p>
        </div>
      </div>
    </div>
  );
}
