"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveQuoteAction, rejectQuoteAction } from "./actions";

interface ApprovalFormProps {
  token: string;
}

type Mode = "idle" | "rejecting" | "rejected";

export function ApprovalForm({ token }: ApprovalFormProps) {
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
        router.refresh();
      } catch (e) {
        console.error("[reject] action threw:", e);
        setError("Sem conexão ou erro no servidor. Tente novamente.");
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        ✍ Aprovar este orçamento
      </div>

      {mode === "idle" && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">
            Digite seu nome para confirmar a aprovação. Fica registrado a data,
            hora e seu nome.
          </p>

          <div className="space-y-2">
            <Label htmlFor="signer-name">Seu nome completo</Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Maria Santos"
              autoComplete="name"
              required
              disabled={pending}
              className="h-12 text-base"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={pending}
              className="h-12 w-full bg-green-600 text-base font-bold text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <CheckCircle2 className="h-5 w-5" />
              {pending ? "Aprovando..." : "Aprovar orçamento"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("rejecting")}
              disabled={pending}
              className="h-12 w-full text-base"
            >
              <MessageCircle className="h-5 w-5" />
              Pedir mudanças
            </Button>
          </div>
        </div>
      )}

      {mode === "rejecting" && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">
            Diga em poucas palavras o que precisa mudar — o empreiteiro vai ler
            isso e ajustar o orçamento.
          </p>

          <div className="space-y-2">
            <Label htmlFor="reject-name">Seu nome completo</Label>
            <Input
              id="reject-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Maria Santos"
              autoComplete="name"
              required
              disabled={pending}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: O preço da mão de obra ficou alto. Posso pagar até R$ 6.000."
              rows={3}
              maxLength={1000}
              disabled={pending}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              onClick={handleReject}
              disabled={pending}
              variant="outline"
              className="h-12 w-full text-base"
            >
              {pending ? "Enviando..." : "Enviar pedido de mudança"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode("idle");
                setError(null);
                setReason("");
              }}
              disabled={pending}
              className="h-10 w-full"
            >
              Voltar
            </Button>
          </div>
        </div>
      )}

      {mode === "rejected" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Pedido de mudança enviado</div>
              <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
                O prestador recebeu sua solicitação e pode reenviar uma versão
                revisada do orçamento pelo WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
