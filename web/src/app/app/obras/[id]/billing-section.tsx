import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  QrCode,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { cn, formatBRL, formatDateBR } from "@/lib/utils";
import type { BillingCharge } from "@/lib/queries/projects";
import type { ChargeStatus, ProjectStatus } from "@/lib/supabase/types";
import { GenerateChargeButton } from "./generate-charge-button";
import { MarkChargePaidButton } from "./mark-charge-paid-button";

interface BillingSectionProps {
  charges: BillingCharge[];
  projectStatus: ProjectStatus;
  budgetCents: number | null;
  deliveryApprovedAt: string | null;
  conversionBillingAttention?: boolean;
}

const STATUS_COPY: Record<
  ChargeStatus,
  { label: string; tone: string; icon: "paid" | "warning" | "clock" }
> = {
  draft: {
    label: "Pix não gerado",
    tone: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
    icon: "warning",
  },
  pending: {
    label: "Aguardando pagamento",
    tone: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100",
    icon: "clock",
  },
  overdue: {
    label: "Vencida",
    tone: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
    icon: "warning",
  },
  received: {
    label: "Recebida",
    tone: "border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100",
    icon: "paid",
  },
  confirmed: {
    label: "Confirmada",
    tone: "border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100",
    icon: "paid",
  },
  cancelled: {
    label: "Cancelada",
    tone: "border-muted bg-muted/30 text-muted-foreground",
    icon: "warning",
  },
};

const PAID_STATUSES: ChargeStatus[] = ["received", "confirmed"];

type NextActionTone = "success" | "warning" | "danger" | "info" | "neutral";

interface BillingNextAction {
  tone: NextActionTone;
  icon: "paid" | "warning" | "clock";
  kicker: string;
  title: string;
  description: string;
  chargeId?: string;
  actionLabel?: string;
}

const NEXT_ACTION_TONE: Record<NextActionTone, string> = {
  success:
    "border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
  danger:
    "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
  info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100",
  neutral: "border-border bg-muted/20 text-foreground",
};

export function BillingSection({
  charges,
  projectStatus,
  budgetCents,
  deliveryApprovedAt,
  conversionBillingAttention = false,
}: BillingSectionProps) {
  const ordered = [...charges].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === "entrada" ? -1 : 1;
  });

  const chargeTotalCents = ordered.reduce(
    (sum, charge) => sum + charge.amount_cents,
    0,
  );
  const totalCents = budgetCents ?? chargeTotalCents;
  const receivedCents = ordered
    .filter((charge) => PAID_STATUSES.includes(charge.status))
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const pendingCents = ordered
    .filter(
      (charge) =>
        !PAID_STATUSES.includes(charge.status) && charge.status !== "cancelled",
    )
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const progressPct =
    totalCents > 0
      ? Math.min(100, Math.round((receivedCents / totalCents) * 100))
      : 0;
  const nextAction = buildNextAction({
    ordered,
    projectStatus,
    deliveryApprovedAt,
    receivedCents,
    pendingCents,
  });
  const entryCharge = ordered.find((charge) => charge.kind === "entrada") ?? null;

  return (
    <section id="cobranca" className="scroll-mt-24 rounded-lg border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Cobrança
          </div>
          <h2 className="mt-0.5 text-base font-semibold">Entrada e saldo da obra</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Gere o Pix, acompanhe o que está pendente e marque como recebido
            somente depois de conferir o pagamento.
          </p>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-left text-sm sm:text-right">
          <div className="text-xs text-muted-foreground">
            Total contratado
          </div>
          <strong className="tabular-nums">{formatBRL(totalCents / 100)}</strong>
        </div>
      </div>

      {conversionBillingAttention ? (
        <ConversionBillingNotice entryCharge={entryCharge} />
      ) : null}

      <div className="mb-4 grid divide-y rounded-lg border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <PaymentMetric
          label="Recebido"
          value={formatBRL(receivedCents / 100)}
          hint={`${progressPct}% do contrato`}
          icon="paid"
        />
        <PaymentMetric
          label="Pendente"
          value={formatBRL(pendingCents / 100)}
          hint={pendingCents > 0 ? "a cobrar ou receber" : "sem pendência"}
          icon="clock"
        />
        <PaymentMetric
          label="Progresso"
          value={`${progressPct}%`}
          hint="baixa confirmada"
          icon="trend"
        />
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Recebimento da obra</span>
          <span className="tabular-nums">
            {formatBRL(receivedCents / 100)} / {formatBRL(totalCents / 100)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <NextActionPanel action={nextAction} />

      {ordered.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
          Esta obra ainda não tem parcelas configuradas. Quando um orçamento
          aprovado vira obra, entrada e saldo aparecem aqui para cobrança.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {ordered.map((charge) => (
            <ChargePanel
              key={charge.id}
              charge={charge}
              deliveryApprovedAt={deliveryApprovedAt}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PaymentMetric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: "paid" | "clock" | "trend";
}) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon === "paid" ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
        ) : icon === "trend" ? (
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Clock3 className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
        )}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tabular-nums">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ConversionBillingNotice({
  entryCharge,
}: {
  entryCharge: BillingCharge | null;
}) {
  const hasGeneratedPix =
    entryCharge?.status === "pending" &&
    Boolean(entryCharge.pix_qr_code || entryCharge.invoice_url);

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <div className="text-sm font-semibold">
              Obra criada. Resolva a entrada antes de começar.
            </div>
            <p className="mt-1 text-sm leading-6 text-amber-900/85">
              {hasGeneratedPix
                ? "O Pix da entrada já está disponível abaixo. Envie ao cliente e acompanhe o recebimento."
                : "A cobrança da entrada precisa de atenção. Use o próximo botão desta seção para gerar ou reenviar o Pix."}
            </p>
          </div>
        </div>
        {entryCharge?.status === "draft" ? (
          <GenerateChargeButton
            chargeId={entryCharge.id}
            label="Gerar Pix da entrada"
            size="default"
            variant="default"
            className="h-11 w-full sm:w-auto"
          />
        ) : null}
      </div>
    </div>
  );
}

function NextActionPanel({ action }: { action: BillingNextAction }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        NEXT_ACTION_TONE[action.tone],
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-md bg-background/70 p-1.5">
            <StatusIcon icon={action.icon} className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase opacity-75">
              {action.kicker}
            </div>
            <h3 className="mt-0.5 text-sm font-semibold">{action.title}</h3>
            <p className="mt-1 text-sm leading-6 opacity-90">
              {action.description}
            </p>
          </div>
        </div>

        {action.chargeId ? (
          <GenerateChargeButton
            chargeId={action.chargeId}
            label={action.actionLabel}
            size="default"
            variant="default"
            className="h-11 w-full sm:w-auto"
          />
        ) : null}
      </div>
    </div>
  );
}

function ChargePanel({
  charge,
  deliveryApprovedAt,
}: {
  charge: BillingCharge;
  deliveryApprovedAt: string | null;
}) {
  const copy = STATUS_COPY[charge.status];
  const title = charge.kind === "entrada" ? "Entrada" : "Saldo";
  const canGenerate =
    charge.status === "draft" ||
    (!charge.asaas_payment_id &&
      !charge.pix_qr_code &&
      !charge.invoice_url &&
      !PAID_STATUSES.includes(charge.status) &&
      charge.status !== "cancelled");
  const canMarkManualPaid =
    charge.payment_provider === "manual_pix" &&
    ["pending", "overdue"].includes(charge.status) &&
    !!charge.pix_qr_code;
  const isSaldoBlocked =
    charge.kind === "saldo" && charge.status === "draft" && !deliveryApprovedAt;
  const actionHint = chargeActionHint(charge, deliveryApprovedAt);

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
            <div className="text-xs font-semibold text-muted-foreground">
            {title}
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums">
            {formatBRL(charge.amount_cents / 100)}
          </div>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
            copy.tone,
          )}
        >
          <StatusIcon icon={copy.icon} />
          {copy.label}
        </div>
      </div>

      <div className="mt-4 rounded-md bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
        <strong className="block text-foreground">O que fazer agora</strong>
        {actionHint}
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        {charge.due_date ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Vencimento</dt>
            <dd className="font-medium">{formatDateBR(charge.due_date)}</dd>
          </div>
        ) : null}
        {charge.paid_at ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Pagamento</dt>
            <dd className="font-medium">{formatDateBR(charge.paid_at)}</dd>
          </div>
        ) : null}
        {isSaldoBlocked ? (
          <div className="flex items-start gap-2 rounded-md border bg-muted/20 p-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Saldo protegido até a entrega ser confirmada.
          </div>
        ) : null}
      </dl>

      {charge.pix_qr_code ? (
        <div className="mt-4 rounded-md border bg-muted/20 p-3">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <QrCode className="h-3.5 w-3.5" />
                Pix para pagamento
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {charge.payment_provider === "manual_pix"
                  ? "Cliente paga no banco. Depois confira o extrato e marque como recebido."
                  : "A baixa chega automaticamente quando o provedor confirmar."}
              </p>
            </div>
            <CopyButton
              text={charge.pix_qr_code}
              label="Copiar Pix"
              copiedLabel="Pix copiado"
              successTitle="Pix copiado"
              successDescription="Envie esse código ao cliente ou cole no WhatsApp."
              analyticsEvent="pix_copied"
              analyticsProperties={{
                source: "project_billing",
                kind: charge.kind,
              }}
              size="sm"
              variant="outline"
              className="h-11 w-full sm:h-9 sm:w-auto"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[132px_1fr]">
            {charge.pix_qr_image_b64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${charge.pix_qr_image_b64}`}
                alt="QR Code Pix"
                width={128}
                height={128}
                className="h-32 w-32 rounded-md border bg-white p-2"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-md border bg-background text-muted-foreground">
                <QrCode className="h-8 w-8" />
              </div>
            )}
            <p className="max-h-32 overflow-hidden break-all rounded-md bg-background p-3 font-mono text-[11px] leading-5">
              {charge.pix_qr_code}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canGenerate ? (
          <GenerateChargeButton
            chargeId={charge.id}
            label={
              charge.kind === "saldo" ? "Gerar Pix do saldo" : "Gerar Pix da entrada"
            }
            className="h-11 w-full sm:h-9 sm:w-auto"
          />
        ) : null}
        {charge.invoice_url ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <a
              href={charge.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir link de cobrança
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
        {canMarkManualPaid ? (
          <MarkChargePaidButton
            chargeId={charge.id}
            amountCents={charge.amount_cents}
            className="h-11 w-full sm:h-9 sm:w-auto"
          />
        ) : null}
      </div>
    </div>
  );
}

function buildNextAction({
  ordered,
  projectStatus,
  deliveryApprovedAt,
  receivedCents,
  pendingCents,
}: {
  ordered: BillingCharge[];
  projectStatus: ProjectStatus;
  deliveryApprovedAt: string | null;
  receivedCents: number;
  pendingCents: number;
}): BillingNextAction {
  const entry = ordered.find((charge) => charge.kind === "entrada");
  const saldo = ordered.find((charge) => charge.kind === "saldo");
  const overdue = ordered.find((charge) => charge.status === "overdue");
  const pending = ordered.find((charge) => charge.status === "pending");
  const workStarted = ["planning", "in_progress"].includes(projectStatus);

  if (ordered.length === 0) {
    return {
      tone: "neutral",
      icon: "clock",
      kicker: "Próxima ação",
      title: "Cobranças ainda não configuradas",
      description:
        "Quando um orçamento aprovado virar obra, entrada e saldo aparecem aqui para gerar Pix, enviar ao cliente e acompanhar recebimento.",
    };
  }

  if (pendingCents === 0 && receivedCents > 0) {
    return {
      tone: "success",
      icon: "paid",
      kicker: "Financeiro resolvido",
      title: "Pagamento completo desta obra",
      description:
        "Todas as parcelas foram confirmadas. Use a obra para acompanhar execução, custos e margem sem misturar valores pendentes.",
    };
  }

  if (overdue) {
    return {
      tone: "danger",
      icon: "warning",
      kicker: "Atenção agora",
      title: `${overdue.kind === "entrada" ? "Entrada" : "Saldo"} vencido`,
      description:
        overdue.payment_provider === "manual_pix"
          ? "Reenvie o Pix ao cliente e confirme no extrato antes de seguir acumulando custo."
          : "Abra a cobrança automática ou reenvie o Pix ao cliente antes de seguir acumulando custo.",
    };
  }

  if (entry?.status === "draft") {
    return {
      tone: "warning",
      icon: "warning",
      kicker: "Próxima ação",
      title: "Gere o Pix da entrada",
      description: workStarted
        ? "A obra já pode estar em andamento; gere a entrada e confirme o pagamento antes de comprar material pesado."
        : "Comece pela entrada para travar compromisso financeiro antes da execução.",
      chargeId: entry.id,
      actionLabel: "Gerar Pix da entrada",
    };
  }

  if (entry?.status === "pending") {
    return {
      tone: "warning",
      icon: "clock",
      kicker: "Próxima ação",
      title: "Entrada enviada, pagamento pendente",
      description:
        "Reenvie o Pix pelo WhatsApp e confirme o pagamento antes de assumir despesas grandes.",
    };
  }

  if (saldo?.status === "draft" && deliveryApprovedAt) {
    return {
      tone: "info",
      icon: "clock",
      kicker: "Próxima ação",
      title: "Entrega aprovada, saldo pronto para cobrar",
      description:
        "Gere o Pix do saldo e envie ao cliente para fechar o recebimento da obra.",
      chargeId: saldo.id,
      actionLabel: "Gerar Pix do saldo",
    };
  }

  if (saldo?.status === "draft") {
    return {
      tone: "neutral",
      icon: "clock",
      kicker: "Saldo protegido",
      title: "Saldo fica bloqueado até a entrega",
      description:
        "Quando a entrega for confirmada, o saldo fica pronto para cobrança. Você também pode liberar antes, se combinou isso com o cliente.",
      chargeId: saldo.id,
      actionLabel: "Gerar Pix do saldo",
    };
  }

  if (pending) {
    return {
      tone: "info",
      icon: "clock",
      kicker: "Acompanhamento",
      title: `${pending.kind === "entrada" ? "Entrada" : "Saldo"} aguardando pagamento`,
      description:
        pending.payment_provider === "manual_pix"
          ? "O Pix já foi gerado. Depois que o cliente pagar, confira o extrato e marque a parcela como recebida."
          : "A cobrança já foi gerada. Mantenha o link visível e acompanhe a baixa automática.",
    };
  }

  return {
    tone: "neutral",
    icon: "clock",
    kicker: "Acompanhamento",
    title: "Fluxo financeiro em andamento",
    description:
      "Revise as parcelas abaixo e mantenha o cliente com o link de pagamento mais recente.",
  };
}

function chargeActionHint(
  charge: BillingCharge,
  deliveryApprovedAt: string | null,
) {
  if (charge.status === "received" || charge.status === "confirmed") {
    return "Pagamento confirmado. Esta parcela já entra como recebida na margem da obra.";
  }
  if (charge.status === "overdue") {
    return charge.payment_provider === "manual_pix"
      ? "Cobrança vencida. Reenvie o Pix e combine a regularização antes de continuar acumulando custo."
      : "Cobrança vencida. Reenvie o link de pagamento ou fale com o cliente antes de continuar acumulando custo.";
  }
  if (charge.status === "pending") {
    return charge.payment_provider === "manual_pix"
      ? "Pix ativo. Envie o QR Code ou copia-e-cola no WhatsApp e marque como recebido depois de conferir seu extrato."
      : "Cobrança ativa. Envie o link de pagamento ou o Pix copia-e-cola no WhatsApp do cliente.";
  }
  if (charge.status === "cancelled") {
    return "Cobrança cancelada. Gere uma nova cobrança somente se este valor ainda precisar ser recebido.";
  }
  if (charge.kind === "saldo" && !deliveryApprovedAt) {
    return "Ainda não é hora de cobrar o saldo. Ele fica guardado para o fechamento da entrega.";
  }
  if (charge.kind === "saldo") {
    return "Entrega liberada. Gere o Pix do saldo e envie ao cliente para finalizar o recebimento.";
  }
  return "Pix ainda não existe. Gere a entrada e envie ao cliente.";
}

function StatusIcon({
  icon,
  className,
}: {
  icon: "paid" | "warning" | "clock";
  className?: string;
}) {
  if (icon === "paid") {
    return <CheckCircle2 className={cn("h-3.5 w-3.5", className)} />;
  }
  if (icon === "clock") {
    return <Clock3 className={cn("h-3.5 w-3.5", className)} />;
  }
  return <AlertTriangle className={cn("h-3.5 w-3.5", className)} />;
}
