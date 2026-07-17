"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  ClipboardCheck,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { formatDateBR } from "@/lib/utils";

export function RevisionBriefing({
  sourceId,
  sourceNumber,
  sourceTitle,
  signerName,
  requestedAt,
  reason,
}: {
  sourceId: string;
  sourceNumber: string;
  sourceTitle: string;
  signerName: string;
  requestedAt: string;
  reason: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const cleanedReason =
    reason?.trim() || "Cliente pediu ajustes sem detalhar o motivo.";

  async function copyReason() {
    try {
      await navigator.clipboard.writeText(cleanedReason);
      setCopied(true);
      toast({
        variant: "success",
        title: "Pedido copiado",
        description: "Use como referência enquanto ajusta a revisão.",
      });
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível copiar",
        description: "Selecione o texto do pedido manualmente.",
      });
    }
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800">
              <AlertCircle aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold">
                Revisão criada a partir de uma recusa
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                {signerName} pediu mudanças em {formatDateBR(requestedAt)} no
                orçamento{" "}
                <Link
                  href={`/app/orcamentos/${sourceId}`}
                  className="font-mono font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {sourceNumber}
                </Link>
                . Ajuste esta versão e envie um novo link para o cliente.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-white/75 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase text-amber-900/70">
                  Pedido do cliente
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                  {cleanedReason}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={copyReason}
                className="shrink-0 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
              >
                {copied ? (
                  <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Copy aria-hidden="true" className="h-4 w-4" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/75 p-3">
          <div className="text-xs font-semibold uppercase text-amber-900/70">
            Roteiro de reenvio
          </div>
          <ol className="mt-2 space-y-2 text-sm leading-6">
            <li>1. Ajuste descrição, itens, valores ou observações.</li>
            <li>2. Salve e envie a revisão pelo WhatsApp.</li>
            <li>3. Envie a mensagem pronta ao cliente.</li>
          </ol>
          <Button
            asChild
            variant="outline"
            className="mt-3 w-full border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
          >
            <Link href={`/app/orcamentos/${sourceId}`}>
              Ver orçamento original
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-3 truncate font-mono text-xs text-amber-900/70">
            {sourceNumber} · {sourceTitle}
          </div>
        </div>
      </div>
    </section>
  );
}
