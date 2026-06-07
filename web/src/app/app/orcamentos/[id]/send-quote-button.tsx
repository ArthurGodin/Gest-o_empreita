"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendQuoteAction } from "../actions";

interface SendQuoteButtonProps {
  quoteId: string;
  /** Telefone do cliente pra montar wa.me link */
  customerPhone?: string | null;
  /** Disabled enquanto outra ação (ex: salvar) está rolando */
  disabled?: boolean;
  /**
   * Callback opcional executado antes do send. Útil pro editor salvar o
   * draft primeiro. Retornar false aborta o envio (e o caller deve ter
   * exibido a razão).
   */
  onBeforeSend?: () => Promise<boolean>;
  /** Label customizável (ex: "Salvar e enviar pro cliente" no editor). */
  label?: string;
}

export function SendQuoteButton({
  quoteId,
  customerPhone,
  disabled,
  onBeforeSend,
  label = "Enviar pro cliente",
}: SendQuoteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  function onSend() {
    setError(null);
    setBlockers([]);
    startTransition(async () => {
      if (onBeforeSend) {
        const proceed = await onBeforeSend();
        if (!proceed) return;
      }
      const result = await sendQuoteAction(quoteId);
      if (!result.ok) {
        setError(result.error);
        setBlockers(result.blockers ?? []);
        setOpen(true);
        return;
      }
      setShareUrl(result.url);
      setOpen(true);
      router.refresh();
    });
  }

  async function onCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-and-prompt
      window.prompt("Copie este link:", shareUrl);
    }
  }

  const waLink = customerPhone
    ? `https://wa.me/${customerPhone.replace(/\D/g, "").replace(/^55/, "55").replace(/^(\d{10,11})$/, "55$1")}?text=${encodeURIComponent(
        `Olá! Aqui está o orçamento que combinamos: ${shareUrl ?? ""}`,
      )}`
    : null;

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {shareUrl ? (
            <>
              <DialogHeader>
                <DialogTitle>Link pronto para enviar</DialogTitle>
                <DialogDescription>
                  Copie o link abaixo e mande no WhatsApp do cliente. Quando ele
                  aprovar, o orçamento aparece como aprovado no painel.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button type="button" onClick={onCopy} variant="outline">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>

                {waLink && (
                  <Button asChild className="w-full">
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      Abrir no WhatsApp
                    </a>
                  </Button>
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
                  {blockers.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 text-destructive">•</span>
                      <span>{b}</span>
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
