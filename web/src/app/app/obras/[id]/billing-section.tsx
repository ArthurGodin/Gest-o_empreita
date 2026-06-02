import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { BillingCharge } from "@/lib/queries/projects";
import type { ChargeStatus, ProjectStatus } from "@/lib/supabase/types";
import { GenerateChargeButton } from "./generate-charge-button";

interface BillingSectionProps {
  charges: BillingCharge[];
  projectStatus: ProjectStatus;
  budgetCents: number | null;
  deliveryApprovedAt: string | null;
}

const STATUS_COPY: Record<
  ChargeStatus,
  { label: string; tone: string; icon: "paid" | "warning" | "clock" }
> = {
  draft: {
    label: "Pix nao gerado",
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
    tone: "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100",
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

export function BillingSection({
  charges,
  projectStatus,
  budgetCents,
  deliveryApprovedAt,
}: BillingSectionProps) {
  const ordered = [...charges].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === "entrada" ? -1 : 1;
  });
  const totalCents =
    ordered.reduce((sum, charge) => sum + charge.amount_cents, 0) ??
    budgetCents ??
    0;
  const receivedCents = ordered
    .filter((charge) => PAID_STATUSES.includes(charge.status))
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const pendingCents = Math.max(totalCents - receivedCents, 0);
  const entryCharge = ordered.find((charge) => charge.kind === "entrada");
  const shouldWarnEntry =
    entryCharge &&
    ["pending", "overdue"].includes(entryCharge.status) &&
    ["planning", "in_progress"].includes(projectStatus);

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cobranca
          </div>
          <h2 className="mt-1 text-lg font-semibold">Entrada e saldo da obra</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recebido: {formatBRL(receivedCents / 100)} - Pendente:{" "}
            {formatBRL(pendingCents / 100)}
          </p>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-right text-sm">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total contratado
          </div>
          <strong>{formatBRL(totalCents / 100)}</strong>
        </div>
      </div>

      {shouldWarnEntry ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Entrada ainda nao paga. Voce pode seguir, mas confirme antes de
            comprar material pesado.
          </p>
        </div>
      ) : null}

      {ordered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          Esta obra ainda nao tem parcelas configuradas. O fluxo automatico
          aparece quando um orcamento aprovado vira obra.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
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

function ChargePanel({
  charge,
  deliveryApprovedAt,
}: {
  charge: BillingCharge;
  deliveryApprovedAt: string | null;
}) {
  const copy = STATUS_COPY[charge.status];
  const title = charge.kind === "entrada" ? "Entrada" : "Saldo";
  const canGenerate = charge.status === "draft" || !charge.asaas_payment_id;
  const isSaldoBlocked =
    charge.kind === "saldo" && charge.status === "draft" && !deliveryApprovedAt;

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </div>
          <div className="mt-1 text-xl font-bold">
            {formatBRL(charge.amount_cents / 100)}
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs ${copy.tone}`}>
          <StatusIcon icon={copy.icon} />
          {copy.label}
        </div>
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
          <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
            Sera liberado quando a entrega for confirmada ou quando voce gerar
            manualmente.
          </div>
        ) : null}
      </dl>

      {charge.pix_qr_code ? (
        <div className="mt-4 rounded-md border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" />
            Pix copia e cola
          </div>
          <p className="max-h-20 overflow-hidden break-all font-mono text-[11px] leading-5">
            {charge.pix_qr_code}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canGenerate ? (
          <GenerateChargeButton
            chargeId={charge.id}
            label={charge.kind === "saldo" ? "Liberar saldo" : "Gerar Pix"}
          />
        ) : null}
        {charge.invoice_url ? (
          <Button asChild size="sm" variant="outline">
            <a
              href={charge.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir cobranca
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StatusIcon({ icon }: { icon: "paid" | "warning" | "clock" }) {
  if (icon === "paid") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (icon === "clock") return <Clock3 className="h-3.5 w-3.5" />;
  return <CircleDollarSign className="h-3.5 w-3.5" />;
}
