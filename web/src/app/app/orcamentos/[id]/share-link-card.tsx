"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Link as LinkIcon,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { revokeShareTokenAction } from "../actions";
import { env } from "@/lib/env";
import { isShareTokenUrlSafe } from "@/lib/quote-token-shared";

interface ShareLinkCardProps {
  quoteId: string;
  shareToken: string;
}

function subscribeOrigin() {
  return () => {};
}

function getBrowserOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return env.NEXT_PUBLIC_APP_URL;
}

export function ShareLinkCard({ quoteId, shareToken }: ShareLinkCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentToken, setCurrentToken] = useState(shareToken);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Em runtime client, preferir o origin real do browser; cai pro env (SSR
  // primeiro render) só pra evitar hydration mismatch.
  const origin = useSyncExternalStore(
    subscribeOrigin,
    getBrowserOrigin,
    getServerOrigin,
  );
  const tokenIsSafe = isShareTokenUrlSafe(currentToken);
  const url = tokenIsSafe ? `${origin}/q/${currentToken}` : "";

  async function onCopy() {
    if (!url) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      setError("Não consegui copiar automaticamente. Selecione o link e copie manualmente.");
    }
  }

  function onRevoke() {
    setConfirmOpen(false);
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
        Copie e mande no WhatsApp do cliente. Quando ele aprovar, o status
        aparece aqui no painel.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={url || "Link antigo inválido. Gere um novo link."}
          className="min-h-10 flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          onClick={onCopy}
          variant="outline"
          size="sm"
          disabled={!tokenIsSafe}
          className="min-h-10"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      {!tokenIsSafe && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Este orçamento tem um link antigo que quebra no navegador. Gere um
          link novo antes de mandar para o cliente.
        </div>
      )}

      {error && (
        <div
          className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-start gap-2 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Esse link é único. Só quem tem o link consegue ver o orçamento.</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className="w-fit text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          {pending
            ? "Gerando..."
            : tokenIsSafe
              ? "Gerar link novo"
              : "Corrigir link"}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar novo link?</DialogTitle>
            <DialogDescription>
              O link atual deixa de funcionar imediatamente. Use isso se o link
              antigo foi enviado por engano ou precisa ser corrigido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={onRevoke} disabled={pending}>
              {pending ? "Gerando..." : "Gerar novo link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
