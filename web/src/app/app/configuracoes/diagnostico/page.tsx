import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Mail,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env-server";
import { whatsappLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DemoKitButton } from "./demo-kit-button";

export const metadata = {
  title: "Diagnóstico de produção — Prumo",
};

type ReadinessStatus = "ready" | "attention" | "blocked";

interface ReadinessItem {
  title: string;
  detail: string;
  status: ReadinessStatus;
  action: string;
  icon: typeof CheckCircle2;
}

const statusCopy: Record<
  ReadinessStatus,
  { label: string; className: string; iconClassName: string }
> = {
  ready: {
    label: "Pronto",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
  },
  attention: {
    label: "Atenção",
    className:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100",
    iconClassName: "text-amber-700 dark:text-amber-300",
  },
  blocked: {
    label: "Bloqueia venda",
    className:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100",
    iconClassName: "text-red-700 dark:text-red-300",
  },
};

export default async function ProductionDiagnosticsPage() {
  const company = await getActiveCompanyFull();
  if (!company) redirect("/onboarding");

  const asaasIsSandbox = serverEnv.ASAAS_API_URL.includes("sandbox");
  const appUrlIsProduction =
    !env.NEXT_PUBLIC_APP_URL.includes("localhost") &&
    !env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1");
  const companyHasPhone = Boolean(company.phone?.trim());
  const companyWhatsappReady = Boolean(whatsappLink(company.phone));
  const metaAdsReady = Boolean(
    env.NEXT_PUBLIC_META_PIXEL_ID && serverEnv.META_CONVERSIONS_ACCESS_TOKEN,
  );

  const items: ReadinessItem[] = [
    {
      title: "Identidade da empresa",
      detail: companyWhatsappReady
        ? "Nome e WhatsApp comercial estão prontos para aparecer nos orçamentos."
        : companyHasPhone
          ? "O telefone cadastrado parece invalido ou de teste. Troque pelo WhatsApp comercial real antes de vender."
          : "Falta WhatsApp comercial. O cliente precisa saber por onde chamar.",
      status: companyWhatsappReady ? "ready" : "blocked",
      action: companyWhatsappReady
        ? "Manter dados revisados antes de cada demo."
        : "Cadastre o telefone em Configurações.",
      icon: MessageCircle,
    },
    {
      title: "Domínio gratuito de produção",
      detail: appUrlIsProduction
        ? "O app está apontando para uma URL pública, sem custo de domínio agora."
        : "A URL pública parece estar local. Links enviados podem quebrar fora da sua máquina.",
      status: appUrlIsProduction ? "ready" : "blocked",
      action: appUrlIsProduction
        ? "Usar o domínio gratuito até a primeira venda."
        : "Ajustar NEXT_PUBLIC_APP_URL na Vercel.",
      icon: Rocket,
    },
    {
      title: "Analytics de funil",
      detail:
        "Pageviews, eventos Vercel e logs estruturados cobrem orçamento, WhatsApp, PDF, aprovação, obra e Pix.",
      status: "ready",
      action:
        "Depois do deploy, acompanhar pageviews na Vercel e eventos via logs product_event.",
      icon: BarChart3,
    },
    {
      title: "Mensuração do Facebook Ads",
      detail: metaAdsReady
        ? "Meta Pixel e Conversions API estão configurados para medir o funil com mais confiabilidade."
        : "Meta Pixel e/ou Conversions API não estão configurados. Anúncios podem vender, mas a Meta não terá mensuração suficiente para otimizar a campanha.",
      status: metaAdsReady ? "ready" : "blocked",
      action: metaAdsReady
        ? "Validar eventos no Gerenciador de Eventos antes de aumentar o orçamento."
        : "Configurar NEXT_PUBLIC_META_PIXEL_ID e META_CONVERSIONS_ACCESS_TOKEN na Vercel antes de subir campanha.",
      icon: BarChart3,
    },
    {
      title: "Asaas",
      detail: serverEnv.ASAAS_API_KEY
        ? asaasIsSandbox
          ? "Sandbox configurado e ciclo entrada -> saldo validado. Ainda não cobra dinheiro real."
          : "Produção configurada. Cobranças podem envolver dinheiro real."
        : "API Key do Asaas não configurada. Pix não será gerado.",
      status: serverEnv.ASAAS_API_KEY
        ? asaasIsSandbox
          ? "attention"
          : "ready"
        : "blocked",
      action: serverEnv.ASAAS_API_KEY
        ? asaasIsSandbox
          ? "Usar sandbox em demos; virar produção só quando houver cliente pronto para pagar."
          : "Fazer teste controlado de baixo valor antes de vender sem acompanhamento."
        : "Configurar ASAAS_API_KEY na Vercel.",
      icon: CreditCard,
    },
    {
      title: "Webhook Asaas",
      detail: serverEnv.ASAAS_WEBHOOK_TOKEN
        ? "Token presente. Webhook já foi validado contra duplicidade, token inválido e baixa de entrada/saldo."
        : "Token ausente. O endpoint não consegue autenticar os eventos enviados pelo Asaas.",
      status: serverEnv.ASAAS_WEBHOOK_TOKEN ? "ready" : "blocked",
      action:
        "Conferir no painel do Asaas se a URL do webhook está ativa e sem fila pausada.",
      icon: ShieldCheck,
    },
    {
      title: "Resend",
      detail: serverEnv.RESEND_API_KEY
        ? "Envio de email está configurado para suporte interno e notificações básicas."
        : "Email não está configurado. O app deve depender do WhatsApp neste momento.",
      status: serverEnv.RESEND_API_KEY ? "ready" : "attention",
      action: serverEnv.RESEND_API_KEY
        ? "Manter WhatsApp como canal principal até comprar domínio."
        : "Configurar RESEND_API_KEY apenas se quiser notificações por email.",
      icon: Mail,
    },
    {
      title: "Alertas operacionais",
      detail:
        serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM
          ? "Falhas criticas de webhook, checkout, cadastro, PDF e frontend enviam alerta por email."
          : "Alertas por email ainda nao estao completos. O app registra logs, mas pode nao avisar voce automaticamente.",
      status:
        serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM
          ? "ready"
          : "attention",
      action:
        serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM
          ? "Usa ALERT_EMAIL_TO quando existir; senao envia para o email extraido de EMAIL_FROM."
          : "Configurar RESEND_API_KEY e EMAIL_FROM na Vercel. ALERT_EMAIL_TO e recomendado como destino dedicado.",
      icon: AlertTriangle,
    },
    {
      title: "PDF de orçamento",
      detail:
        "PDF público e administrativo fazem parte da apresentação comercial do orçamento.",
      status: "ready",
      action:
        "Antes de cada demo, baixar um PDF real de orçamento para validar runtime.",
      icon: FileText,
    },
    {
      title: "Plano sem custo fixo",
      detail:
        "Domínio próprio e Speed Insights continuam opcionais até a primeira venda.",
      status:
        process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "true"
          ? "ready"
          : "attention",
      action:
        "Não comprar domínio agora; investir só quando houver cliente pagando.",
      icon: Wrench,
    },
  ];

  const readyCount = items.filter((item) => item.status === "ready").length;
  const blockedItems = items.filter((item) => item.status === "blocked");
  const attentionItems = items.filter((item) => item.status === "attention");
  const score = Math.round((readyCount / items.length) * 100);
  const pilotStatus =
    blockedItems.length === 0
      ? "Pronto para venda e tráfego controlado"
      : "Ajuste bloqueios antes de anunciar";
  const financialProof = [
    "Orçamento aprovado vira obra com cobrança de entrada.",
    "Webhook baixa pagamento sem duplicar evento.",
    "Conclusão da obra libera saldo final.",
    "Entrada e saldo pagos aparecem no financeiro.",
    "Cliente vê pagamento completo no link público.",
  ];

  return (
    <div className="container max-w-6xl space-y-4 py-5 sm:py-6">
      <PageHeader
        title="Diagnóstico de produção"
        description="Painel objetivo para saber se o Prumo está pronto para demonstrar, vender e cobrar sem improviso."
        actions={
          <Button asChild variant="outline">
            <Link href="/app/configuracoes">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Voltar
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 lg:grid-cols-[1fr_18rem]">
        <div className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Prontidão comercial
              </div>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                {pilotStatus}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                O objetivo aqui é vender com segurança: link público abrindo,
                WhatsApp funcionando, Pix sob controle e dados suficientes para
                saber onde o cliente travou.
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-center">
              <div className="text-2xl font-bold tabular-nums">{score}%</div>
              <div className="text-xs font-medium text-muted-foreground">
                do checklist pronto
              </div>
            </div>
          </div>

          <div className="mt-4 grid divide-y rounded-lg border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Metric label="Prontos" value={readyCount} tone="ready" />
            <Metric label="Atenção" value={attentionItems.length} tone="attention" />
            <Metric label="Bloqueios" value={blockedItems.length} tone="blocked" />
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-bold">Regra de venda</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Se existir item em “Bloqueia venda”, não faça demo fria. Se
                houver só “Atenção”, faça demo guiada e explique a limitação.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white/70 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ciclo validado
            </div>
            <h2 className="mt-4 text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">
              {asaasIsSandbox
                ? "O fluxo fecha ponta a ponta no sandbox"
                : "O fluxo de cobrança está ativo em produção"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/80">
              {asaasIsSandbox
                ? "Entrada, conclusão da obra, saldo, webhooks e financeiro podem ser demonstrados sem movimentar dinheiro real."
                : "O ambiente usa Asaas de produção e pode movimentar dinheiro real. Entrada, saldo, webhooks e financeiro já foram validados; em demos, não conclua uma nova cobrança apenas para apresentar o fluxo."}
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {financialProof.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-md border border-emerald-200 bg-white/75 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-50"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
                <span className="leading-6">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <ReadinessCard key={item.title} item={item} />
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-4 sm:p-5">
            <div className="inline-flex items-center gap-2 rounded-md border bg-muted/35 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Rocket className="h-3.5 w-3.5" />
              Demo guiada
            </div>
            <h2 className="mt-4 text-xl font-black tracking-tight">
              Kit de demonstração vendável
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Prepara dados realistas para apresentar o produto sem improviso:
              cliente, orçamento aprovado, link público, obra em andamento,
              etapas, diário, custos e cobranças locais em rascunho.
            </p>

            <div className="mt-5">
              <DemoKitButton />
            </div>
          </div>

          <div className="border-t bg-muted/20 p-4 sm:p-5 lg:border-l lg:border-t-0">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
              Como usar na venda
            </h3>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Abra o orçamento e mostre a proposta com itens e PDF.",
                "Abra o link do cliente como se estivesse no WhatsApp.",
                "Mostre a obra com etapas, diário, custos e cobranças.",
                asaasIsSandbox
                  ? "Mostre entrada e saldo no sandbox, sem movimentar dinheiro real."
                  : "Mostre o histórico já validado e não conclua uma cobrança real durante a demo.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-black text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="leading-6 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight">
              Roteiro de demonstração recomendado
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use sempre a mesma sequência para reduzir erro na apresentação e
              descobrir onde o produto ainda precisa melhorar.
            </p>
          </div>
          <Button asChild>
            <Link href="/app/orcamentos/novo">Criar orçamento de demo</Link>
          </Button>
        </div>

        <ol className="mt-5 grid gap-2 text-sm md:grid-cols-2">
          {[
            "Criar cliente com telefone real.",
            "Criar orçamento com 2 ou 3 itens.",
            "Salvar e abrir WhatsApp com mensagem pronta.",
            "Abrir link público no celular.",
            "Baixar PDF e pedir ajuste.",
            "Criar revisão e reenviar.",
            "Aprovar como cliente.",
            asaasIsSandbox
              ? "Virar obra e gerar Pix sandbox."
              : "Virar obra e revisar a cobrança sem concluir um novo pagamento real.",
            asaasIsSandbox
              ? "Concluir etapas e liberar saldo sandbox."
              : "Concluir etapas e revisar a liberação do saldo no histórico validado.",
          ].map((step, index) => (
            <li
              key={step}
              className="flex gap-3 rounded-md border bg-muted/20 px-3 py-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ReadinessStatus;
}) {
  const copy = statusCopy[tone];

  return (
    <div className={cn("px-3 py-2", copy.className)}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-semibold">{label}</div>
    </div>
  );
}

function ReadinessCard({ item }: { item: ReadinessItem }) {
  const copy = statusCopy[item.status];
  const Icon = item.icon;
  const StatusIcon =
    item.status === "ready"
      ? CheckCircle2
      : item.status === "blocked"
        ? AlertTriangle
        : Wrench;

  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold tracking-tight">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {item.detail}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold",
            copy.className,
          )}
        >
          <StatusIcon className={cn("h-3.5 w-3.5", copy.iconClassName)} />
          {copy.label}
        </span>
      </div>
      <div className="mt-4 rounded-md bg-muted/35 px-3 py-2 text-xs leading-5 text-muted-foreground">
        {item.action}
      </div>
    </article>
  );
}
