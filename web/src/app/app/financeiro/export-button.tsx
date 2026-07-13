"use client";

import { useState } from "react";
import { Crown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportFinanceDataAction } from "./actions";

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const result = await exportFinanceDataAction();
    setLoading(false);

    if (!result.ok) {
      alert(result.error);
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
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="gap-2 font-medium"
    >
      <Download className="h-4 w-4 text-emerald-600" />
      {loading ? "Gerando..." : "Exportar contábil"}
      <Crown className="ml-1 h-3 w-3 text-amber-500" />
    </Button>
  );
}
