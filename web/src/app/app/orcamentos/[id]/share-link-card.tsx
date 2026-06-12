"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock3,
  Copy,
  Link as LinkIcon,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  markQuoteWhatsappSentAction,
  revokeShareTokenAction,
} from "../actions";
import { env } from "@/lib/env";
import { formatPhone, whatsappLink, whatsappShareLink } from "@/lib/format";
import { formatDateTimeBR } from "@/lib/utils";
import {
  buildQuoteWhatsappMessage,
  type QuoteShareMessageMode,
} from "@/lib/quote-share-message";
import { isShareTokenUrlSafe } from "@/lib/quote-token-shared";

interface ShareLinkCardProps {
  quoteId: string;
  shareToken: string;
  quoteNumber?: string | null;
  quoteTitle?: string | null;
  quoteTotalCents?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  whatsappSentAt?: string | null;
  messageMode?: QuoteShareMessageMode;
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

export function ShareLinkCard({
  quoteId,
  shareToken,
  quoteNumber,
  quoteTitle,
  quoteTotalCents,
  customerName,
  customerPhone,
  whatsappSentAt,
  messageMode = "quote",
}: ShareLinkCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentToken, setCurrentToken] = useState(shareToken);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(whatsappSentAt);
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
  const helperText =
    messageMode === "revision"
      ? "Reenvie a revisão com mensagem pronta. O link antigo pode continuar salvo como histórico, mas este é o link ativo."
      : "Envie o orçamento pelo WhatsApp com mensagem pronta. O link abaixo fica como fallback para copiar manualmente.";
  const whatsappMessage = tokenIsSafe
    ? buildQuoteWhatsappMessage({
        customerName,
        quoteNumber,
        quoteTitle,
        totalCents: quoteTotalCents,
        url,
        mode: messageMode,
      })
    : null;
  const whatsappUrl = whatsappMessage
    ? whatsappShareLink({ phone: customerPhone, message: whatsappMessage })
    : null;
  const directWhatsapp = Boolean(whatsappLink(customerPhone));
  const phoneLabel = formatPhone(customerPhone);
  const lastSentLabel = lastSentAt ? formatDateTimeBR(lastSentAt) : null;

  function onOpenWhatsapp() {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    startTransition(async () => {
      const result = await markQuoteWhatsappSentAction(quoteId);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Envio aberto, mas sem registro",
          description: result.error,
        });
        return;
      }
      setLastSentAt(result.sent_at);
      toast({
        variant: "success",
        title: "Envio registrado",
        description: "O orçamento ficou marcado como enviado pelo WhatsApp.",
      });
      router.refresh();
    });
  }

  async function onCopy() {
    if (!url) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        variant: "success",
        title: "Link copiado",
        description: "Cole no WhatsApp do cliente quando quiser reenviar.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      const message =
        "Não consegui copiar automaticamente. Selecione o link e copie manualmente.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Cópia automática falhou",
        description: message,
      });
    }
  }

  async function onCopyMessage() {
    if (!whatsappMessage) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedMessage(true);
      toast({
        variant: "success",
        title: "Mensagem copiada",
        description: "Cole no WhatsApp do cliente se preferir enviar manualmente.",
      });
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      const message =
        "Não consegui copiar automaticamente. Selecione a mensagem e copie manualmente.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Cópia automática falhou",
        description: message,
      });
    }
  }

  function onRevoke() {
    setConfirmOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await revokeShareTokenAction(quoteId);
      if (!result.ok) {
        setError(result.error);
        toast({
          variant: "destructive",
          title: "Não foi possível gerar link",
          description: result.error,
        });
        return;
      }
      setCurrentToken(result.share_token);
      toast({
        variant: "success",
        title: "Novo link gerado",
        description: "O link antigo foi invalidado. Envie o novo para o cliente.",
      });
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        Envio para o cliente
      </div>

      <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>

      {lastSentLabel ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-900 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100">
          <Clock3 className="h-3.5 w-3.5" />
          Último envio pelo WhatsApp: {lastSentLabel}
        </div>
      ) : (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Ainda sem envio registrado pelo WhatsApp
        </div>
      )}

      {whatsappUrl && whatsappMessage && (
        <div className="mt-4 space-y-3">
          <Button
            type="button"
            size="lg"
            onClick={onOpenWhatsapp}
            disabled={pending}
            className="h-12 w-full bg-green-600 text-base hover:bg-green-700"
          >
            <Send className="h-5 w-5" />
            {pending
              ? "Registrando..."
              : directWhatsapp && phoneLabel
                ? `Abrir WhatsApp de ${phoneLabel}`
                : "Abrir WhatsApp e escolher contato"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {directWhatsapp && phoneLabel
              ? "A conversa abre com a mensagem preenchida. Revise e toque em enviar."
              : "Telefone vazio ou inválido. O WhatsApp abre com a mensagem pronta para você escolher o contato."}
          </p>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              Mensagem pronta
            </div>
            <textarea
              readOnly
              value={whatsappMessage}
              rows={6}
              className="w-full resize-none rounded-md border border-input bg-muted px-3 py-2 text-sm leading-5"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={onCopyMessage} variant="outline">
              {copiedMessage ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedMessage ? "Mensagem copiada" : "Copiar mensagem"}
            </Button>
            <Button
              type="button"
              onClick={onCopy}
              variant="outline"
              disabled={!tokenIsSafe}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copiado" : "Copiar link"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <LinkIcon className="h-3.5 w-3.5" />
          Link público
        </div>
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={url || "Link antigo inválido. Gere um novo link."}
          className="min-h-10 w-full rounded-md border border-input bg-muted px-3 py-2 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
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
