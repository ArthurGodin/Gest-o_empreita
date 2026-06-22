"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { checkoutProAction } from "./actions";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpgrade() {
    setLoading(true);
    router.push("/app/configuracoes/plano/checkout");
  }

  return (
    <Button
      size="lg"
      onClick={handleUpgrade}
      disabled={loading}
      className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-md shadow-amber-500/20 text-base"
    >
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <Zap className="mr-2 h-5 w-5" />
      )}
      {loading ? "Processando..." : "Assinar Plano PRO"}
    </Button>
  );
}
