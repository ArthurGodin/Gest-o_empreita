"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { trackProductEvent } from "@/lib/product-analytics";
import { PLAN_DEFINITIONS, type PaidPlan } from "@/lib/plans";
import { checkoutPlanAction, confirmPlanUpgradeAction } from "../actions";

interface PaymentFormProps {
  plan: PaidPlan;
  pendingCheckoutUrl?: string | null;
  pendingOtherPlan?: string | null;
  replacesLegacyPending?: boolean;
}

export function PaymentForm({
  plan,
  pendingCheckoutUrl,
  pendingOtherPlan,
  replacesLegacyPending,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const definition = PLAN_DEFINITIONS[plan];

  async function handlePayment() {
    trackProductEvent("saas_checkout_started", { plan });
    setLoading(true);

    try {
      const result = await checkoutPlanAction(plan);

      if (!result.ok) {
        trackProductEvent("saas_checkout_failed", {
          plan,
          reason: "action_failed",
        });
        toast({
          variant: "destructive",
          title: "Nao foi possivel gerar o pagamento",
          description: result.error,
        });
        return;
      }

      trackProductEvent("saas_checkout_generated", {
        plan,
        simulated: result.simulated,
        reused: Boolean(result.reused),
      });

      if (!result.simulated) {
        window.location.href = result.checkoutUrl;
        return;
      }

      const simulatedUpgrade = await confirmPlanUpgradeAction(plan);
      if (!simulatedUpgrade.ok) {
        throw new Error(simulatedUpgrade.error ?? "Falha na simulacao.");
      }

      trackProductEvent("saas_checkout_simulated_activated", { plan });
      toast({
        variant: "success",
        title: "Plano ativado no modo simulado",
        description: `Sua conta agora esta no ${definition.label}.`,
      });

      router.refresh();
      router.push("/app/configuracoes/plano");
    } catch {
      trackProductEvent("saas_checkout_failed", {
        plan,
        reason: "unexpected_exception",
      });
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Nao foi possivel concluir a assinatura agora.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (pendingCheckoutUrl) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-3 text-sm">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <div className="font-semibold text-amber-950">
                Link de pagamento pendente
              </div>
              <p className="mt-1 leading-6 text-amber-900/80">
                Este link ainda nao criou boleto automaticamente. Continue nele
                e escolha Pix, cartao ou boleto dentro do Asaas.
              </p>
            </div>
          </div>
        </div>

        <Button
          asChild
          size="lg"
          className="w-full bg-amber-600 text-white hover:bg-amber-700"
        >
          <a href={pendingCheckoutUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-5 w-5" />
            Continuar no Asaas
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {pendingOtherPlan || replacesLegacyPending ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <div className="font-semibold text-amber-950">
                Pendencia anterior sera encerrada
              </div>
              <p className="mt-1 leading-6 text-amber-900/80">
                Ao continuar, o Prumo cancela a assinatura/cobranca antiga no
                Asaas e abre um link novo, sem gerar boleto automatico.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/50 p-3">
        <div className="flex items-start gap-3 text-sm">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <div className="font-semibold text-slate-900">
              Pagamento seguro no Asaas
            </div>
            <p className="mt-1 leading-6 text-muted-foreground">
              O Prumo abre um link recorrente do Asaas. Pix, cartao e boleto
              ficam na tela do gateway; boleto so nasce se voce escolher gerar
              boleto por la.
            </p>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        onClick={handlePayment}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ShieldCheck className="h-5 w-5" />
        )}
        {loading ? "Abrindo Asaas…" : "Ir para pagamento seguro"}
      </Button>
    </div>
  );
}
