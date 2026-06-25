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
}

type Mode = "idle" | "rejecting" | "rejected";

export function ApprovalForm({ token, companyName, contactUrl }: ApprovalFormProps) {
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
      className="scroll-mt-4 rounded-3xl border border-slate-200/60 bg-white p-6 md:p-8 shadow-lg shadow-slate-200/40 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-[40px] pointer-events-none" />
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Decisão do cliente
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
            Aprovar ou pedir ajuste
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 font-medium">
            Sua resposta fica registrada para {companyName}. Você não precisa
            criar conta.
          </p>
        </div>
      </div>

      {mode === "idle" && (
        <div className="mt-8 space-y-6 relative z-10">
          <div className="space-y-2">
            <Label htmlFor="signer-name" className="text-xs font-bold uppercase tracking-wider text-slate-600">Seu nome completo</Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Maria Santos"
              autoComplete="name"
              required
              disabled={pending}
              className="h-12 text-base bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={pending}
              className="h-14 w-full rounded-2xl bg-[#2f8f4e] text-base font-bold text-white shadow-lg shadow-[#2f8f4e]/20 hover:bg-[#236b3a] hover:scale-[1.02] hover:shadow-xl hover:shadow-[#2f8f4e]/30 transition-all"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {pending ? "Aprovando…" : "Aprovar orçamento agora"}
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
              className="h-14 w-full rounded-2xl border-slate-200 text-base font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <PencilLine className="h-5 w-5 mr-2" />
              Pedir mudanças no orçamento
            </Button>
            {contactUrl && (
              <Button asChild variant="ghost" className="h-12 w-full rounded-xl text-slate-600 font-bold hover:bg-slate-100 hover:text-slate-900 mt-2">
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
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Falar antes no WhatsApp
                </a>
              </Button>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 font-medium">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Ao aprovar, {companyName} recebe o aviso no sistema e pode seguir
              para combinar início, pagamento e execução.
            </span>
          </div>
        </div>
      )}

      {mode === "rejecting" && (
        <div className="mt-6 space-y-6 relative z-10">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-sm text-amber-800 font-medium leading-relaxed">
              Escreva o ajuste que você quer. Isso ajuda {companyName} a reenviar
              uma versão melhor sem perder contexto no WhatsApp.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reject-name" className="text-xs font-bold uppercase tracking-wider text-slate-600">Seu nome completo</Label>
            <Input
              id="reject-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Maria Santos"
              autoComplete="name"
              required
              disabled={pending}
              className="h-12 text-base bg-slate-50 border-slate-200 focus:border-amber-500 focus:ring-amber-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider text-slate-600">O que precisa mudar?</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: O preço da mão de obra ficou alto. Posso pagar até R$ 6.000."
              rows={4}
              maxLength={1000}
              required
              disabled={pending}
              className="resize-none bg-slate-50 border-slate-200 focus:border-amber-500 focus:ring-amber-500 transition-colors text-base"
            />
            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Seja direto: preço, prazo, item ou condição.</span>
              <span>{reason.length}/1000</span>
            </div>
          </div>

          {error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={handleReject}
              disabled={pending}
              className="h-14 w-full rounded-2xl bg-amber-500 text-base font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/30 transition-all"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
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
                className="h-12 flex-1 rounded-xl font-bold text-slate-600"
              >
                Cancelar
              </Button>
              {contactUrl && (
                <Button asChild variant="outline" className="h-12 flex-1 rounded-xl font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
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
        <div className="mt-6 rounded-2xl border-2 border-amber-500/20 bg-amber-50/50 p-5 backdrop-blur-sm relative z-10">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-amber-900 tracking-tight text-lg">Pedido de mudança enviado!</div>
              <p className="mt-1 text-sm font-medium text-amber-800/80 leading-relaxed">
                {companyName} recebeu sua solicitação e vai analisar o seu pedido.
              </p>
              {contactUrl && (
                <Button asChild className="mt-4 h-11 rounded-xl bg-white text-amber-900 border border-amber-200 font-bold hover:bg-amber-100 shadow-sm transition-all">
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
                    <MessageCircle className="h-4 w-4 mr-2" />
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
