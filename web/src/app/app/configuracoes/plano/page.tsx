import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Blocks,
  Building2,
  Check,
  Crown,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/queries/company";
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

  return (
    <div className="mx-auto max-w-6xl space-y-10 py-8">
      <header className="grid gap-6 rounded-2xl border bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-end md:p-8">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Plano atual: {currentDefinition.label}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Escolha o plano certo para vender, executar e cobrar melhor.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            O Starter serve para validar o produto. O Pro tira a operação da
            planilha. O Ultimate acelera orçamento em escala com importação de
            catálogo e exportação contábil.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm shadow-sm">
          <div className="font-semibold text-slate-950">Próximo ganho prático</div>
          <p className="mt-1 max-w-xs leading-6 text-muted-foreground">
            Menos digitação repetida, cobrança mais clara e orçamento com cara
            de empresa profissional.
          </p>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        {PLAN_SEQUENCE.map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            currentPlan={currentPlan}
            featured={plan === "pro"}
          />
        ))}
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <FeatureHighlight
          icon={<FileText className="h-5 w-5" />}
          title="Orçamentos que vendem"
          text="Link público, PDF profissional e aceite digital para reduzir ida e volta no WhatsApp."
        />
        <FeatureHighlight
          icon={<Building2 className="h-5 w-5" />}
          title="Obra sob controle"
          text="O orçamento aprovado vira obra, cronograma, diário, custos e cobrança sem retrabalho."
        />
        <FeatureHighlight
          icon={<Blocks className="h-5 w-5" />}
          title="Escala com catálogo"
          text="No Ultimate, a planilha antiga vira base de itens para orçar mais rápido e com menos erro."
        />
      </section>
    </div>
  );
}

function PlanCard({
  plan,
  currentPlan,
  featured = false,
}: {
  plan: AppPlan;
  currentPlan: AppPlan;
  featured?: boolean;
}) {
  const definition = PLAN_DEFINITIONS[plan];
  const isCurrent = currentPlan === plan;
  const isIncluded = !isCurrent && isPlanAtLeast(currentPlan, plan);
  const canUpgrade = PLAN_ORDER[currentPlan] < PLAN_ORDER[plan] && plan !== "free";
  const Icon = plan === "ultimate" ? Crown : plan === "pro" ? Sparkles : ShieldCheck;

  return (
    <article
      className={cn(
        "relative flex min-h-[560px] flex-col rounded-2xl border bg-white p-6 shadow-sm",
        featured && "border-emerald-500 shadow-lg shadow-emerald-500/10",
        plan === "ultimate" && "bg-slate-950 text-white",
      )}
    >
      {featured ? (
        <div className="absolute left-6 top-0 -translate-y-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
          Mais escolhido
        </div>
      ) : null}

      {isCurrent ? (
        <div className="absolute right-6 top-0 -translate-y-1/2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
          Seu plano
        </div>
      ) : null}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div
            className={cn(
              "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
              plan === "ultimate"
                ? "bg-white/10 text-emerald-300"
                : "bg-emerald-50 text-emerald-700",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold">{definition.name}</h2>
          <p
            className={cn(
              "mt-2 min-h-[72px] text-sm leading-6",
              plan === "ultimate" ? "text-slate-300" : "text-muted-foreground",
            )}
          >
            {definition.description}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black tracking-tight">
            {formatPlanPrice(plan)}
          </span>
          {plan !== "free" ? (
            <span
              className={cn(
                "mb-1 text-sm font-medium",
                plan === "ultimate" ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              /mês
            </span>
          ) : null}
        </div>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {definition.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm leading-6">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                plan === "ultimate" ? "text-emerald-300" : "text-emerald-600",
              )}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-3">
        {canUpgrade ? (
          <UpgradeButton plan={plan as PaidPlan} />
        ) : (
          <div
            className={cn(
              "flex h-12 items-center justify-center rounded-xl border text-sm font-semibold",
              plan === "ultimate"
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
              plan === "ultimate" ? "text-slate-400" : "text-muted-foreground",
            )}
          >
            Pagamento seguro via Asaas. Sem fidelidade.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function FeatureHighlight({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
