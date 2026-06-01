"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Eye, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isShareTokenUrlSafe } from "@/lib/quote-token-shared";

interface PublicLinkCalloutProps {
  shareToken: string | null;
  baseUrl?: string;
}

function subscribeOrigin() {
  return () => {};
}

function getBrowserOrigin() {
  return window.location.origin;
}

export function PublicLinkCallout({
  shareToken,
  baseUrl,
}: PublicLinkCalloutProps) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    subscribeOrigin,
    getBrowserOrigin,
    () => baseUrl ?? "",
  );

  if (!shareToken) {
    return (
      <section className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        Essa obra não veio de um orçamento aprovado, então não tem link público
        pra acompanhamento do cliente.
      </section>
    );
  }

  const tokenIsSafe = isShareTokenUrlSafe(shareToken);
  const url = tokenIsSafe ? `${origin}/q/${shareToken}` : "";

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" />
        Link público (mesmo do orçamento)
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        O cliente abre o mesmo link que aprovou o orçamento e agora vê também o{" "}
        <strong>andamento da obra</strong>: status, etapas e fotos do diário.{" "}
        <strong>Custos e ponto da equipe são internos</strong> — não aparecem
        pro cliente.
      </p>
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 min-w-0 items-center rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs">
          <span className="truncate">
            {url || "Link antigo inválido. Corrija no orçamento original."}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={copy}
          disabled={!tokenIsSafe}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </Button>
        {tokenIsSafe && (
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5" />
              Visualizar
            </a>
          </Button>
        )}
      </div>
    </section>
  );
}
