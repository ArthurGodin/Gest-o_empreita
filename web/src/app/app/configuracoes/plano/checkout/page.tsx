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
    <div className="min-h-[80vh] bg-slate-50 px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        <section className="rounded-2xl border bg-white p-6 shadow-sm md:p-8">
          <Button asChild variant="ghost" className="-ml-3 mb-6 text-muted-foreground">
            <Link href="/app/configuracoes/plano">
              <ArrowLeft className="h-4 w-4" />
              Voltar para planos
            </Link>
          </Button>

          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon className="h-6 w-6" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Assinar {targetDefinition.label}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Abra o gateway seguro do Asaas para escolher Pix, cartao ou boleto.
            O Prumo nao emite boleto nesta tela; o plano so libera quando o
            pagamento for confirmado pelo Asaas.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
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

          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <div className="text-sm font-semibold text-emerald-950">
                  Assinatura mensal, sem fidelidade
                </div>
                <p className="mt-1 text-sm leading-6 text-emerald-900/80">
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

        <aside className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b pb-5">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Plano selecionado
              </div>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {targetDefinition.name}
              </h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950">
                {formatPlanPrice(targetPlan)}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                por mes
              </div>
            </div>
          </div>

          <ul className="my-6 space-y-3">
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
      </div>
    </div>
  );
}

function PaymentMethod({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm font-semibold text-slate-800 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
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
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
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
