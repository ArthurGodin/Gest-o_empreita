"use client";

import Link from "next/link";
import { useState } from "react";
import { Crown, Download, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import type { AppPlan } from "@/lib/plans";
import { exportFinanceDataAction } from "./actions";

export function ExportButton({
  currentPlan,
  projectPluralLower,
}: {
  currentPlan: AppPlan;
  projectPluralLower: string;
}) {
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isUltimate = currentPlan === "ultimate";

  async function handleExport() {
    if (!isUltimate) {
      setUpgradeOpen(true);
      return;
    }

    setLoading(true);
    const result = await exportFinanceDataAction();
    setLoading(false);

    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Não foi possível exportar",
        description: result.error,
      });
      return;
    }

    const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `prumo_contabil_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={loading}
        className="gap-2 font-medium"
        aria-label={
          isUltimate
            ? "Exportar relatório contábil em CSV"
            : "Exportar relatório contábil em CSV, recurso do Ultimate"
        }
      >
        <Download
          aria-hidden="true"
          className="h-4 w-4 text-emerald-600"
        />
        {loading ? "Gerando…" : "Exportar contábil"}
        <Crown aria-hidden="true" className="ml-1 h-3 w-3 text-amber-500" />
      </Button>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportação contábil no Ultimate</DialogTitle>
            <DialogDescription>
              O CSV reúne receitas recebidas e custos registrados em{" "}
              {projectPluralLower} para enviar ao contador ou analisar em uma
              planilha.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            />
            <p className="leading-6">
              Seu financeiro continua disponível no Prumo. Apenas a exportação
              em lote é exclusiva do plano Ultimate.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
              Continuar no plano atual
            </Button>
            <Button asChild>
              <Link href="/app/configuracoes/plano">Ver plano Ultimate</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
