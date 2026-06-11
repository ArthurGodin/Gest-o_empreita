"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, Send } from "lucide-react";
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
import { formatPhone, whatsappLink, whatsappShareLink } from "@/lib/format";
import { buildQuoteWhatsappMessage } from "@/lib/quote-share-message";
import { sendQuoteAction } from "../actions";

interface SendQuoteButtonProps {
  quoteId: string;
  quoteNumber?: string | null;
  quoteTitle?: string | null;
  quoteTotalCents?: number | null;
  customerName?: string | null;
  /** Telefone do cliente pra montar wa.me link. */
  customerPhone?: string | null;
  /** Disabled enquanto outra ação, como salvar, está rolando. */
  disabled?: boolean;
  /**
   * Callback opcional executado antes do envio. Útil para o editor salvar o
   * rascunho primeiro. Retornar false aborta o envio.
   */
  onBeforeSend?: () => Promise<boolean>;
  /** Label customizável, como "Salvar e enviar pro cliente" no editor. */
  label?: string;
  messageMode?: "quote" | "revision";
}

export function SendQuoteButton({
  quoteId,
  quoteNumber,
  quoteTitle,
  quoteTotalCents,
  customerName,
  customerPhone,
  disabled,
  onBeforeSend,
  label = "Enviar no WhatsApp",
  messageMode = "quote",
}: SendQuoteButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  function onSend() {
    setError(null);
    setBlockers([]);
    setCopyError(null);
    startTransition(async () => {
      if (onBeforeSend) {
        const proceed = await onBeforeSend();
        if (!proceed) return;
      }
      const result = await sendQuoteAction(quoteId);
      if (!result.ok) {
        setError(result.error);
        setBlockers(result.blockers ?? []);
        toast({
          variant: "destructive",
          title: "Não foi possível enviar",
          description: result.error,
        });
        setOpen(true);
        return;
      }
      setShareUrl(withCurrentOrigin(result.url));
      toast({
        variant: "success",
        title:
          messageMode === "revision"
            ? "Revisão pronta para WhatsApp"
            : "Orçamento pronto para WhatsApp",
        description:
          messageMode === "revision"
            ? "Abra a conversa do cliente com a mensagem revisada pronta."
            : "Abra a conversa do cliente com a mensagem pronta.",
      });
      setOpen(true);
    });
  }

  function onDialogOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && shareUrl) {
      router.refresh();
    }
  }

  async function onCopy() {
    if (!shareUrl) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        variant: "success",
        title: "Link copiado",
        description: "Agora é só colar no WhatsApp do cliente.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      const message =
        "Não consegui copiar automaticamente. Selecione o link e copie manualmente.";
      setCopyError(message);
      toast({
        variant: "destructive",
        title: "Cópia automática falhou",
        description: message,
      });
    }
  }

  async function onCopyMessage() {
    if (!whatsappMessage) return;
    setCopyError(null);
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
      const message = "Não consegui copiar a mensagem automaticamente.";
      setCopyError(message);
      toast({
        variant: "destructive",
        title: "Cópia automática falhou",
        description: message,
      });
    }
  }

  const whatsappMessage = shareUrl
    ? buildQuoteWhatsappMessage({
        customerName,
        quoteNumber,
        quoteTitle,
        totalCents: quoteTotalCents,
        url: shareUrl,
        mode: messageMode,
      })
    : null;
  const waLink = whatsappMessage
    ? whatsappShareLink({ phone: customerPhone, message: whatsappMessage })
    : null;
  const directWhatsapp = Boolean(whatsappLink(customerPhone));
  const phoneLabel = formatPhone(customerPhone);
  const dialogTitle =
    messageMode === "revision"
      ? "Enviar revisão pelo WhatsApp"
      : "Enviar orçamento pelo WhatsApp";
  const dialogDescription =
    messageMode === "revision"
      ? "A mensagem já inclui o novo link da revisão. O orçamento original continua preservado no histórico."
      : "A mensagem já inclui o link de aprovação. Quando o cliente aprovar ou pedir ajuste, o status aparece no painel.";

  return (
    <>
      <Button
        type="button"
        onClick={onSend}
        disabled={pending || disabled}
        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
      >
        <Send className="h-4 w-4" />
        {pending ? "Enviando..." : label}
      </Button>

      <Dialog open={open} onOpenChange={onDialogOpenChange}>
        <DialogContent>
          {shareUrl ? (
            <>
              <DialogHeader>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogDescription>{dialogDescription}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {waLink && whatsappMessage && (
                  <div className="space-y-3">
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full bg-green-600 text-base hover:bg-green-700"
                    >
                      <a href={waLink} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-5 w-5" />
                        {directWhatsapp && phoneLabel
                          ? `Abrir WhatsApp de ${phoneLabel}`
                          : "Abrir WhatsApp e escolher contato"}
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {directWhatsapp && phoneLabel
                        ? "O WhatsApp abre direto na conversa do cliente com a mensagem preenchida."
                        : "O cliente não tem telefone válido cadastrado. O WhatsApp abre com a mensagem pronta para você escolher o contato."}
                    </p>
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">
                        Mensagem pronta
                      </div>
                      <textarea
                        readOnly
                        value={whatsappMessage}
                        rows={7}
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
                      <Button type="button" onClick={onCopy} variant="outline">
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copied ? "Link copiado" : "Copiar link"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">
                    Link público
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>

                {copyError && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {copyError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Fechar</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Não foi possível enviar</DialogTitle>
                <DialogDescription>
                  {error ?? "Confira os campos antes de mandar."}
                </DialogDescription>
              </DialogHeader>

              {blockers.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {blockers.map((blocker, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1 text-destructive">•</span>
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Voltar e ajustar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function withCurrentOrigin(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}
