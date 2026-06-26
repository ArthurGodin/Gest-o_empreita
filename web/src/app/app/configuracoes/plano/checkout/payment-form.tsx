"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { PLAN_DEFINITIONS, type PaidPlan } from "@/lib/plans";
import { checkoutPlanAction, confirmPlanUpgradeAction } from "../actions";

interface PaymentFormProps {
  plan: PaidPlan;
}

export function PaymentForm({ plan }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState("");
  const router = useRouter();
  const definition = PLAN_DEFINITIONS[plan];

  async function handlePayment() {
    const normalizedDocument = document.replace(/\D/g, "");
    if (![11, 14].includes(normalizedDocument.length)) {
      toast({
        variant: "destructive",
        title: "Documento inválido",
        description: "Digite um CPF ou CNPJ válido para gerar a cobrança.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await checkoutPlanAction(plan, normalizedDocument);

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Erro no pagamento",
          description: result.error,
        });
        return;
      }

      if (!result.simulated) {
        window.location.href = result.checkoutUrl;
        return;
      }

      const simulatedUpgrade = await confirmPlanUpgradeAction(plan);
      if (!simulatedUpgrade.ok) {
        throw new Error(simulatedUpgrade.error ?? "Falha na simulação.");
      }

      toast({
        variant: "success",
        title: "Plano ativado no modo simulado",
        description: `Sua conta agora está no ${definition.label}.`,
      });

      router.refresh();
      router.push("/app/configuracoes/plano");
    } catch {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Não foi possível concluir a assinatura agora.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="document">CPF ou CNPJ do assinante</Label>
        <Input
          id="document"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={document}
          onChange={(event) => setDocument(event.target.value)}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Este documento é enviado ao Asaas apenas para emitir a assinatura do
          {` ${definition.label}`}.
        </p>
      </div>

      <div className="rounded-xl border bg-slate-50 p-3">
        <div className="flex items-start gap-3 text-sm">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <div className="font-semibold text-slate-900">
              Pagamento seguro na próxima tela
            </div>
            <p className="mt-1 leading-6 text-muted-foreground">
              O Prumo gera a assinatura e redireciona você para escolher a forma
              de pagamento diretamente no Asaas.
            </p>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        onClick={handlePayment}
        disabled={loading}
        className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ShieldCheck className="h-5 w-5" />
        )}
        {loading ? "Gerando assinatura..." : "Ir para pagamento seguro"}
      </Button>
    </div>
  );
}
