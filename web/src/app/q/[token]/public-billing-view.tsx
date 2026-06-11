"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  WalletCards,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/supabase/types";
import type { PublicBillingCharge } from "./andamento-view";
import { approveDeliveryAction } from "./actions";

interface PublicBillingViewProps {
  charges: PublicBillingCharge[];
  projectStatus: ProjectStatus;
  deliveryApprovedAt: string | null;
  shareToken: string;
}

const PAID = new Set(["received", "confirmed"]);

export function PublicBillingView({
  charges,
  projectStatus,
  deliveryApprovedAt,
  shareToken,
}: PublicBillingViewProps) {
  const ordered = [...charges].sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === "entrada" ? -1 : 1;
  });
  const saldo = ordered.find((charge) => charge.kind === "saldo") ?? null;
  const shouldApproveDelivery =
    projectStatus === "completed" &&
    !deliveryApprovedAt &&
    saldo?.status === "draft";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-md bg-primary/10 p-2 text-primary">
            <WalletCards className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Pagamento da obra
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe entrada, saldo e comprovação de pagamento pelo Asaas.
            </p>
          </div>
        </div>
      </section>

      {shouldApproveDelivery ? (
        <DeliveryApprovalForm shareToken={shareToken} />
      ) : null}

      {ordered.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
          A cobrança ainda não foi liberada pela empreiteira.
        </section>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ordered.map((charge) => (
            <PublicChargeCard
              key={charge.id}
              charge={charge}
              deliveryApprovedAt={deliveryApprovedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryApprovalForm({ shareToken }: { shareToken: string }) {
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
      setDone(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-green-300 bg-green-50 p-5 text-green-950 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold">Confirme a entrega da obra</h3>
            <p className="mt-1 text-sm opacity-90">
              Confirmando a entrega, o saldo fica liberado para pagamento via Pix.
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
              className="self-end"
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
}: {
  charge: PublicBillingCharge;
  deliveryApprovedAt: string | null;
}) {
  const paid = PAID.has(charge.status);
  const title = charge.kind === "entrada" ? "Entrada" : "Saldo";
  const waitingDelivery =
    charge.kind === "saldo" && charge.status === "draft" && !deliveryApprovedAt;

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          <div className="mt-1 text-2xl font-bold">
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
          <p className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
            Este saldo será liberado depois da confirmação da entrega.
          </p>
        ) : null}
      </div>

      {charge.pix_qr_code && !paid ? (
        <div className="mt-4 rounded-md border bg-muted/20 p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-medium text-muted-foreground">
              Pix copia e cola
            </div>
            <CopyButton
              text={charge.pix_qr_code}
              label="Copiar Pix"
              copiedLabel="Pix copiado"
              successTitle="Pix copiado"
              successDescription="Cole este código no aplicativo do seu banco."
              size="sm"
              variant="outline"
              className="h-11 w-full sm:h-9 sm:w-auto"
            />
          </div>
          <p className="max-h-20 overflow-hidden break-all font-mono text-[11px] leading-5">
            {charge.pix_qr_code}
          </p>
        </div>
      ) : null}

      {charge.invoice_url && !paid ? (
        <Button asChild className="mt-4 h-11 w-full">
          <a href={charge.invoice_url} target="_blank" rel="noopener noreferrer">
            Pagar agora
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : null}
    </section>
  );
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
    return `${base} border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100`;
  }
  return `${base} border-muted bg-muted/30 text-muted-foreground`;
}
