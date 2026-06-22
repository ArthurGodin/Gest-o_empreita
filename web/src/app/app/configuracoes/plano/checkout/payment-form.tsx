"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { confirmProUpgradeAction } from "../actions";

export function PaymentForm() {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const router = useRouter();

  async function handlePayment() {
    setLoading(true);
    try {
      const res = await confirmProUpgradeAction();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro no pagamento",
          description: res.error,
        });
        return;
      }
      
      toast({
        variant: "success",
        title: "Pagamento Aprovado!",
        description: "Sua conta agora é PRO. Aproveite!",
      });
      
      // Force refresh to update the plan in the layout/sidebar
      router.refresh();
      // Redirect back to plan page
      router.push("/app/configuracoes/plano");
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Não foi possível concluir a transação.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMethod("pix")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
            method === "pix"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
        >
          <QrCode className="h-6 w-6 mb-2" />
          <span className="text-sm font-semibold">Pix</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
            method === "card"
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
              : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
        >
          <CreditCard className="h-6 w-6 mb-2" />
          <span className="text-sm font-semibold">Cartão</span>
        </button>
      </div>

      <div className="pt-2">
        <Button
          size="lg"
          onClick={handlePayment}
          disabled={loading}
          className={`w-full h-12 text-white border-0 shadow-md text-base ${
            method === "pix"
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
          }`}
        >
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            method === "pix" ? <QrCode className="mr-2 h-5 w-5" /> : <CreditCard className="mr-2 h-5 w-5" />
          )}
          {loading ? "Processando..." : `Pagar R$ 97,00 com ${method === "pix" ? "Pix" : "Cartão"}`}
        </Button>
      </div>
    </div>
  );
}
