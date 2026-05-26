"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link as LinkIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revokeShareTokenAction } from "../actions";
import { env } from "@/lib/env";

interface ShareLinkCardProps {
  quoteId: string;
  shareToken: string;
}

export function ShareLinkCard({ quoteId, shareToken }: ShareLinkCardProps) {
  const router = useRouter();
  const [currentToken, setCurrentToken] = useState(shareToken);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Em runtime client, preferir o origin real do browser; cai pro env (SSR
  // primeiro render) só pra evitar hydration mismatch.
  const [origin, setOrigin] = useState(env.NEXT_PUBLIC_APP_URL);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const url = `${origin}/q/${currentToken}`;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie este link:", url);
    }
  }

  function onRevoke() {
    if (!confirm("Gerar um link novo? O link antigo deixa de funcionar imediatamente.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await revokeShareTokenAction(quoteId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrentToken(result.share_token);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <LinkIcon className="h-4 w-4" />
        Link público do orçamento
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Copie e mande no WhatsApp do cliente. Quando ele abrir e aprovar, você
        recebe um email.
      </p>

      <div className="mt-3 flex items-stretch gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" onClick={onCopy} variant="outline" size="sm">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          🔒 Esse link é único. Só quem tem o link consegue ver o orçamento.
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={pending}
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          {pending ? "Gerando..." : "Gerar link novo"}
        </Button>
      </div>
    </section>
  );
}
