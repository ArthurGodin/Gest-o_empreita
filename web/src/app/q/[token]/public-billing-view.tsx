"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  QrCode,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatBRL, formatDateBR } from "@/lib/utils";
import { trackProductEvent } from "@/lib/product-analytics";
import {
  isProfessionalSegment,
  type BusinessSegment,
} from "@/lib/business-segment";
import type { ProjectStatus } from "@/lib/supabase/types";
import type { PublicBillingCharge } from "./andamento-view";
import { approveDeliveryAction } from "./actions";

interface PublicBillingViewProps {
  charges: PublicBillingCharge[];
  projectStatus: ProjectStatus;
  deliveryApprovedAt: string | null;
  deliveryAcceptance: {
    signer_name: string;
    accepted_at: string;
  } | null;
  hasPendingDeliverables: boolean;
  shareToken: string;
  businessSegment: BusinessSegment;
  paymentInstructions?: string | null;
}

const PAID = new Set(["received", "confirmed"]);

export function PublicBillingView({
  charges,
  projectStatus,
  deliveryApprovedAt,
  deliveryAcceptance,
  hasPendingDeliverables,
  shareToken,
  businessSegment,
  paymentInstructions,
}: PublicBillingViewProps) {
  const professional = isProfessionalSegment(businessSegment);
  const ordered = [...charges].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === "entrada" ? -1 : 1;
  });
  const saldo = ordered.find((charge) => charge.kind === "saldo") ?? null;
  const shouldApproveDelivery =
    projectStatus === "completed" &&
    !deliveryApprovedAt &&
    !hasPendingDeliverables &&
    saldo?.status === "draft";
  const waitingForDeliverableReviews =
    projectStatus === "completed" &&
    !deliveryApprovedAt &&
    hasPendingDeliverables &&
    saldo?.status === "draft";
  const totalCents = ordered.reduce(
    (sum, charge) => sum + charge.amount_cents,
    0,
  );
  const paidCents = ordered
    .filter((charge) => PAID.has(charge.status))
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const pendingCents = ordered
    .filter(
      (charge) => !PAID.has(charge.status) && charge.status !== "cancelled",
    )
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const progressPct =
    totalCents > 0
      ? Math.min(100, Math.round((paidCents / totalCents) * 100))
      : 0;
  const nextStep = publicNextStep({
    ordered,
    shouldApproveDelivery,
    deliveryApprovedAt,
    paidCents,
    pendingCents,
    professional,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-primary/10 p-2 text-primary">
            <WalletCards className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight">
              Pagamentos {professional ? "do projeto" : "da obra"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Veja a entrada, o saldo e o próximo passo de pagamento sem
              precisar fazer login. Depois do pagamento, esta tela mostra o
              status atualizado assim que a confirmação chega ao sistema.
            </p>
          </div>
        </div>

        <div className="mt-4 grid overflow-hidden rounded-md border sm:grid-cols-3">
          <PublicMetric label="Pago" value={formatBRL(paidCents / 100)} />
          <PublicMetric
            label="Pendente"
            value={formatBRL(pendingCents / 100)}
          />
          <PublicMetric label="Total" value={formatBRL(totalCents / 100)} />
        </div>

        {totalCents > 0 ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Pagamento confirmado</span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className={cn("mt-4 rounded-lg border px-4 py-3", nextStep.tone)}>
          <div className="flex items-start gap-3">
            {nextStep.icon === "paid" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : nextStep.icon === "warning" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <strong className="block text-sm">{nextStep.title}</strong>
              <p className="mt-1 text-sm leading-6 opacity-90">
                {nextStep.description}
              </p>
            </div>
          </div>
        </div>

        {deliveryAcceptance ? (
          <div className="mt-4 flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <strong className="block">Aceite final registrado</strong>
              <p className="mt-0.5 leading-5 text-emerald-900/80">
                {deliveryAcceptance.signer_name} confirmou em{" "}
                {formatDateBR(deliveryAcceptance.accepted_at)}.
              </p>
            </div>
          </div>
        ) : null}

        {paymentInstructions ? (
          <div className="mt-4 rounded-lg border bg-muted/20 px-4 py-3 text-sm leading-6">
              <strong className="block text-foreground">
              Mensagem da equipe responsável
            </strong>
            <p className="mt-1 text-muted-foreground">{paymentInstructions}</p>
          </div>
        ) : null}
      </section>

      {waitingForDeliverableReviews ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">
                Revise as entregas antes do aceite final
              </h3>
              <p className="mt-1 text-sm leading-6 text-amber-900/85">
                Existe uma versão atual que ainda não está
                aprovada. O saldo continua protegido até todas as entregas
                publicadas concluírem a revisão.
              </p>
              <Button
                asChild
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 h-10 border-amber-300 bg-white/70 hover:bg-white"
              >
                <a href="?tab=entregas">Revisar entregas</a>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {shouldApproveDelivery ? (
        <DeliveryApprovalForm
          shareToken={shareToken}
          professional={professional}
        />
      ) : null}

      {ordered.length === 0 ? (
        <section className="rounded-lg border border-dashed bg-card p-4 text-sm leading-6 text-muted-foreground">
          A equipe ainda não liberou nenhuma cobrança para{" "}
          {professional ? "este projeto" : "esta obra"}.
        </section>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ordered.map((charge) => (
            <PublicChargeCard
              key={charge.kind}
              charge={charge}
              deliveryApprovedAt={deliveryApprovedAt}
              professional={professional}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PublicMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b p-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function DeliveryApprovalForm({
  shareToken,
  professional,
}: {
  shareToken: string;
  professional: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await approveDeliveryAction({
        token: shareToken,
        signer_name: name,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      trackProductEvent("project_delivery_accepted");
      setDone(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold">
              Confirme a entrega {professional ? "do projeto" : "da obra"}
            </h3>
            <p className="mt-1 text-sm opacity-90">
              Confirme somente se o combinado foi entregue. Depois disso, o
              saldo poderá ser liberado para pagamento via Pix.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="delivery-signer">Seu nome</Label>
              <Input
                id="delivery-signer"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={pending || done}
                className="bg-background text-foreground"
              />
            </div>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || done}
              className="h-11 self-end"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {done ? "Entrega confirmada" : "Confirmar entrega"}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}

function PublicChargeCard({
  charge,
  deliveryApprovedAt,
  professional,
}: {
  charge: PublicBillingCharge;
  deliveryApprovedAt: string | null;
  professional: boolean;
}) {
  const paid = PAID.has(charge.status);
  const title = charge.kind === "entrada" ? "Entrada" : "Saldo";
  const waitingDelivery =
    charge.kind === "saldo" && charge.status === "draft" && !deliveryApprovedAt;
  const instruction = publicChargeInstruction(charge, deliveryApprovedAt);

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            {title}
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {formatBRL(charge.amount_cents / 100)}
          </div>
        </div>
        <span className={statusClass(charge.status)}>
          {paid ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : charge.status === "overdue" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <Clock3 className="h-3.5 w-3.5" />
          )}
          {statusLabel(charge.status)}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
        <strong className="block text-foreground">O que fazer</strong>
        {instruction}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {charge.due_date ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Vencimento</span>
            <strong>{formatDateBR(charge.due_date)}</strong>
          </div>
        ) : null}
        {charge.paid_at ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Pago em</span>
            <strong>{formatDateBR(charge.paid_at)}</strong>
          </div>
        ) : null}
        {waitingDelivery ? (
          <p className="flex items-start gap-2 rounded-md border bg-muted/20 p-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Este saldo será liberado depois da confirmação da entrega.
          </p>
        ) : null}
      </div>

      {charge.pix_qr_code && !paid ? (
        <div className="mt-4 rounded-md border bg-muted/20 p-3">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <QrCode className="h-3.5 w-3.5" />
                Pix para pagamento
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Escaneie o QR Code ou copie o código para pagar no app do seu banco.
                {charge.payment_provider === "asaas"
                  ? " Pagamento processado com segurança via Asaas."
                  : " Envie o comprovante para a equipe registrar o recebimento."}
              </p>
            </div>
            <CopyButton
              text={charge.pix_qr_code}
              label="Copiar Pix"
              copiedLabel="Pix copiado"
              successTitle="Pix copiado"
              successDescription="Cole este código no aplicativo do seu banco."
              analyticsEvent="pix_copied"
              analyticsProperties={{
                source: "public_billing",
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

      {charge.invoice_url && !paid ? (
        <div className="mt-4 space-y-2">
          {charge.payment_provider === "asaas" ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-950">
              O pagamento abre em ambiente seguro do Asaas. Quando for
              confirmado, o Prumo atualiza{" "}
              {professional ? "este projeto" : "esta obra"} automaticamente.
            </p>
          ) : null}
          <Button asChild className="h-11 w-full">
            <a href={charge.invoice_url} target="_blank" rel="noopener noreferrer">
              Pagar agora
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function publicNextStep({
  ordered,
  shouldApproveDelivery,
  deliveryApprovedAt,
  paidCents,
  pendingCents,
  professional,
}: {
  ordered: PublicBillingCharge[];
  shouldApproveDelivery: boolean;
  deliveryApprovedAt: string | null;
  paidCents: number;
  pendingCents: number;
  professional: boolean;
}) {
  const overdue = ordered.find((charge) => charge.status === "overdue");
  const pending = ordered.find((charge) => charge.status === "pending");
  const saldo = ordered.find((charge) => charge.kind === "saldo");

  if (ordered.length === 0) {
    return {
      icon: "clock" as const,
      title: "Cobrança ainda não liberada",
      description:
        "A equipe libera a cobrança quando a próxima etapa financeira estiver pronta.",
      tone: "border-border bg-muted/20 text-foreground",
    };
  }

  if (pendingCents === 0 && paidCents > 0) {
    return {
      icon: "paid" as const,
      title: "Pagamento completo",
      description: `As parcelas ${professional ? "deste projeto" : "desta obra"} já aparecem como pagas. Guarde este link para acompanhar o andamento.`,
      tone: "border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100",
    };
  }

  if (overdue) {
    return {
      icon: "warning" as const,
      title: "Existe uma cobrança vencida",
      description:
        "Regularize esta parcela antes de seguir. Se já pagou, envie o comprovante para a equipe.",
      tone: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
    };
  }

  if (shouldApproveDelivery) {
    return {
      icon: "paid" as const,
      title: "Confirme a entrega para liberar o saldo",
      description: `Se ${professional ? "o projeto" : "a obra"} foi entregue conforme combinado, confirme para permitir a emissão do Pix do saldo.`,
      tone: "border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100",
    };
  }

  if (pending) {
    return {
      icon: "clock" as const,
      title: `${pending.kind === "entrada" ? "Entrada" : "Saldo"} aguardando pagamento`,
      description:
        pending.payment_provider === "manual_pix"
          ? "Pague pelo QR Code ou Pix copia-e-cola. Depois envie o comprovante para a equipe registrar o recebimento."
          : "Use o botão de pagamento ou copie o Pix. A baixa aparece automaticamente quando o pagamento for confirmado.",
      tone: "border-blue-200 bg-emerald-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100",
    };
  }

  if (saldo?.status === "draft" && !deliveryApprovedAt) {
    return {
      icon: "clock" as const,
      title: "Saldo protegido até a entrega",
      description:
        "O saldo final aparece para pagamento quando a entrega for confirmada ou liberada pela equipe.",
      tone: "border-border bg-muted/20 text-foreground",
    };
  }

  return {
    icon: "clock" as const,
    title: "Acompanhe o próximo pagamento",
    description:
      "Quando houver uma nova cobrança disponível, o QR Code ou botão de pagamento aparecerá aqui.",
    tone: "border-border bg-muted/20 text-foreground",
  };
}

function publicChargeInstruction(
  charge: PublicBillingCharge,
  deliveryApprovedAt: string | null,
) {
  if (charge.status === "received" || charge.status === "confirmed") {
    return "Pagamento confirmado. Nenhuma ação é necessária nesta parcela.";
  }
  if (charge.status === "overdue") {
    return "Esta parcela venceu. Regularize pelo Pix disponível ou fale com a equipe se já tiver pago.";
  }
  if (charge.status === "pending") {
    return charge.payment_provider === "manual_pix"
      ? "Escaneie o QR Code ou copie o Pix para o app do seu banco. Depois envie o comprovante para a equipe."
      : "Pague pelo botão abaixo ou copie o Pix para o aplicativo do seu banco.";
  }
  if (charge.status === "cancelled") {
    return "Esta cobrança foi cancelada pela equipe.";
  }
  if (charge.kind === "saldo" && !deliveryApprovedAt) {
    return "Saldo final aguardando liberação. Ele aparece para pagamento quando a entrega for confirmada.";
  }
  if (charge.kind === "saldo") {
    return "Saldo pronto para pagamento assim que o Pix for gerado pela equipe.";
  }
  return "Entrada aguardando emissão do Pix pela equipe.";
}

function statusLabel(status: PublicBillingCharge["status"]) {
  if (status === "received" || status === "confirmed") return "Pago";
  if (status === "pending") return "Pendente";
  if (status === "overdue") return "Vencido";
  if (status === "cancelled") return "Cancelado";
  return "Aguardando";
}

function statusClass(status: PublicBillingCharge["status"]) {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium";
  if (status === "received" || status === "confirmed") {
    return `${base} border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100`;
  }
  if (status === "overdue") {
    return `${base} border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100`;
  }
  if (status === "pending") {
    return `${base} border-blue-200 bg-emerald-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100`;
  }
  return `${base} border-muted bg-muted/30 text-muted-foreground`;
}
