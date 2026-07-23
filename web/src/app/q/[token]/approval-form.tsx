"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, PencilLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackProductEvent } from "@/lib/product-analytics";
import { approveQuoteAction, rejectQuoteAction } from "./actions";

interface ApprovalFormProps {
  token: string;
  companyName: string;
  contactUrl: string | null;
  isProposal?: boolean;
}

type Mode = "idle" | "rejecting" | "rejected";

export function ApprovalForm({
  token,
  companyName,
  contactUrl,
  isProposal = false,
}: ApprovalFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [signerName, setSignerName] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    if (signerName.trim().length < 2) {
      setError("Digite seu nome (mínimo 2 letras).");
      return;
    }
    setError(null);
    trackProductEvent("quote_approval_started", {
      has_contact_url: Boolean(contactUrl),
    });

    startTransition(async () => {
      try {
        const result = await approveQuoteAction({
          token,
          signer_name: signerName.trim(),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        trackProductEvent("quote_approved", {
          has_contact_url: Boolean(contactUrl),
        });
        router.push(result.redirectTo);
      } catch (e) {
        console.error("[approve] action threw:", e);
        setError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  function handleReject() {
    if (signerName.trim().length < 2) {
      setError("Digite seu nome (mínimo 2 letras).");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Descreva rapidamente o que precisa mudar.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const result = await rejectQuoteAction({
          token,
          signer_name: signerName.trim(),
          reason: reason.trim() || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMode("rejected");
        trackProductEvent("quote_revision_requested", {
          has_contact_url: Boolean(contactUrl),
          reason_length: reason.trim().length,
        });
        router.refresh();
      } catch (e) {
        console.error("[reject] action threw:", e);
        setError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  return (
    <section
      id="decisao"
      className="scroll-mt-4 rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground">
            Decisão do cliente
          </div>
          <h2 className="mt-1 text-base font-semibold">
            Aprovar ou pedir ajuste
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Sua resposta fica registrada para {companyName}. Você não precisa
            criar conta.
          </p>
        </div>
      </div>

      {mode === "idle" && (
        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signer-name">Seu nome completo</Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Maria Santos…"
              autoComplete="name"
              required
              disabled={pending}
            />
          </div>

          {error && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={pending}
              size="lg"
              className="w-full"
            >
              <CheckCircle2 aria-hidden="true" />
              {pending
                ? "Aprovando…"
                : `Aprovar ${isProposal ? "proposta" : "orçamento"} agora`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                trackProductEvent("quote_revision_started", {
                  has_contact_url: Boolean(contactUrl),
                  source: "open_form",
                });
                setMode("rejecting");
              }}
              disabled={pending}
              size="lg"
              className="w-full"
            >
              <PencilLine aria-hidden="true" />
              Pedir mudanças {isProposal ? "na proposta" : "no orçamento"}
            </Button>
            {contactUrl && (
              <Button asChild variant="ghost" className="w-full">
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackProductEvent("quote_contact_whatsapp_clicked", {
                      source: "approval_idle",
                    })
                  }
                >
                  <MessageCircle aria-hidden="true" />
                  Falar antes no WhatsApp
                </a>
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 border-t pt-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Ao aprovar, {companyName} recebe o aviso no sistema e pode seguir
              para combinar início, pagamento e execução.
            </span>
          </div>
        </div>
      )}

      {mode === "rejecting" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm leading-5 text-amber-900">
              Escreva o ajuste que você quer. Isso ajuda {companyName} a reenviar
              uma versão melhor sem perder contexto no WhatsApp.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reject-name">Seu nome completo</Label>
            <Input
              id="reject-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Maria Santos…"
              autoComplete="name"
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">O que precisa mudar?</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: Ajustar prazo ou condição de pagamento…"
              rows={4}
              maxLength={1000}
              required
              disabled={pending}
              className="resize-none"
            />
            <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
              <span>Seja direto: preço, prazo, item ou condição.</span>
              <span>{reason.length}/1000</span>
            </div>
          </div>

          {error && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Button
              type="button"
              onClick={handleReject}
              disabled={pending}
              size="lg"
              className="w-full bg-amber-500 text-white hover:bg-amber-600"
            >
              <MessageCircle aria-hidden="true" />
              {pending ? "Enviando…" : "Enviar pedido de ajuste"}
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("idle");
                  setError(null);
                  setReason("");
                }}
                disabled={pending}
                className="flex-1"
              >
                Cancelar
              </Button>
              {contactUrl && (
                <Button asChild variant="outline" className="flex-1 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100">
                  <a
                    href={contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackProductEvent("quote_contact_whatsapp_clicked", {
                        source: "approval_rejecting",
                      })
                    }
                  >
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === "rejected" && (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-950">Pedido de mudança enviado</div>
              <p className="mt-1 text-sm leading-5 text-amber-800">
                {companyName} recebeu sua solicitação e vai analisar o seu pedido.
              </p>
              {contactUrl && (
                <Button asChild variant="outline" className="mt-4 border-amber-200 bg-white text-amber-900 hover:bg-amber-100">
                  <a
                    href={contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackProductEvent("quote_contact_whatsapp_clicked", {
                        source: "approval_rejected",
                      })
                    }
                  >
                    <MessageCircle aria-hidden="true" />
                    Chamar no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
