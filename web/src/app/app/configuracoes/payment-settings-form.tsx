"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark, Save, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CompanyFull } from "@/lib/queries/company-settings";
import type { PaymentProvider, PixKeyType } from "@/lib/supabase/types";
import { updatePaymentSettingsAction } from "./actions";

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "random", label: "Chave aleatória" },
] as const;

export function PaymentSettingsForm({ company }: { company: CompanyFull }) {
  const router = useRouter();
  const [provider, setProvider] = useState<PaymentProvider>(
    company.payment_provider ?? "asaas",
  );
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(
    company.pix_key_type ?? "random",
  );
  const [pixKey, setPixKey] = useState(company.pix_key ?? "");
  const [pixReceiverName, setPixReceiverName] = useState(
    company.pix_receiver_name ?? company.name,
  );
  const [pixReceiverCity, setPixReceiverCity] = useState(
    company.pix_receiver_city ?? company.city ?? "",
  );
  const [pixInstructions, setPixInstructions] = useState(
    company.pix_instructions ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [savedSignature, setSavedSignature] = useState(() =>
    paymentSignature({
      provider: company.payment_provider ?? "asaas",
      pixKeyType: company.pix_key_type ?? "random",
      pixKey: company.pix_key ?? "",
      pixReceiverName: company.pix_receiver_name ?? company.name,
      pixReceiverCity: company.pix_receiver_city ?? company.city ?? "",
      pixInstructions: company.pix_instructions ?? "",
    }),
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});

    const payload = {
      payment_provider: provider,
      pix_key_type: pixKeyType,
      pix_key: pixKey,
      pix_receiver_name: pixReceiverName,
      pix_receiver_city: pixReceiverCity,
      pix_instructions: pixInstructions,
    };

    startTransition(async () => {
      const result = await updatePaymentSettingsAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSuccess(true);
      setSavedSignature(currentSignature);
      router.refresh();
      setTimeout(() => setSuccess(false), 6000);
    });
  }

  const manualPix = provider === "manual_pix";
  const manualPixReady = Boolean(
    manualPix && pixKeyType && pixKey.trim() && pixReceiverName.trim() && pixReceiverCity.trim(),
  );
  const currentSignature = paymentSignature({
    provider,
    pixKeyType,
    pixKey,
    pixReceiverName,
    pixReceiverCity,
    pixInstructions,
  });
  const hasUnsavedChanges = currentSignature !== savedSignature;

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <WalletCards className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Recebimento das obras</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Escolha como entrada e saldo serão cobrados. Para vender sem
            burocracia, use Pix direto: o cliente paga na chave da sua
            empresa e você confirma o recebimento após conferir o extrato.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ProviderOption
          checked={manualPix}
          icon={WalletCards}
          title="Pix direto na sua chave"
          badge="Recomendado"
          description="Gera QR Code e copia-e-cola sem API. O dinheiro cai na conta vinculada à chave Pix informada aqui."
          onClick={() => setProvider("manual_pix")}
        />
        <ProviderOption
          checked={provider === "asaas"}
          icon={Landmark}
          title="Asaas automático"
          badge="Avançado"
          description="Usa provedor, API e webhook para baixa automática. Não é obrigatório para vender o primeiro projeto."
          onClick={() => setProvider("asaas")}
        />
      </div>

      <input type="hidden" name="payment_provider" value={provider} />

      {manualPix ? (
        <div className="mt-4 space-y-4 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            O Prumo não segura dinheiro da obra. Ele só monta o QR
            Code, organiza a cobrança e deixa claro quando você deve marcar a
            parcela como recebida.
          </div>

          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="pix_key_type">Tipo de chave</Label>
              <select
                id="pix_key_type"
                name="pix_key_type"
                value={pixKeyType}
                onChange={(event) => setPixKeyType(event.target.value as PixKeyType)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
              >
                {PIX_KEY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <FieldError errors={fieldErrors.pix_key_type} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix_key">Chave Pix que receberá os pagamentos</Label>
              <Input
                id="pix_key"
                name="pix_key"
                value={pixKey}
                onChange={(event) => setPixKey(event.target.value)}
                placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória"
              />
              <FieldError errors={fieldErrors.pix_key} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pix_receiver_name">Nome que aparece no banco</Label>
              <Input
                id="pix_receiver_name"
                name="pix_receiver_name"
                value={pixReceiverName}
                onChange={(event) => setPixReceiverName(event.target.value)}
                placeholder="Ex.: Coberturas do Léo"
              />
              <p className="text-xs text-muted-foreground">
                Use o nome que o cliente reconhecerá no app do banco.
              </p>
              <FieldError errors={fieldErrors.pix_receiver_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix_receiver_city">Cidade do recebedor</Label>
              <Input
                id="pix_receiver_city"
                name="pix_receiver_city"
                value={pixReceiverCity}
                onChange={(event) => setPixReceiverCity(event.target.value)}
                placeholder="Ex.: Timon"
              />
              <p className="text-xs text-muted-foreground">
                A cidade também aparece no Pix do banco.
              </p>
              <FieldError errors={fieldErrors.pix_receiver_city} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pix_instructions">Mensagem que aparece para o cliente</Label>
            <Textarea
              id="pix_instructions"
              name="pix_instructions"
              value={pixInstructions}
              onChange={(event) => setPixInstructions(event.target.value)}
              placeholder="Ex.: Depois de pagar, envie o comprovante no WhatsApp para registrarmos o recebimento e seguirmos para a próxima etapa."
              maxLength={500}
            />
            <FieldError errors={fieldErrors.pix_instructions} />
          </div>

          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm leading-6",
              manualPixReady && !hasUnsavedChanges
                ? "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100"
                : manualPixReady
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-border bg-background text-muted-foreground",
            )}
          >
            <div className="font-medium">
              {manualPixReady && !hasUnsavedChanges
                ? "Pix direto ativo para novas cobranças."
                : manualPixReady
                  ? "Dados preenchidos. Salve para ativar o Pix direto."
                  : "Complete chave, nome e cidade para liberar QR Code Pix."}
            </div>
            <div className="text-xs opacity-80">
              A obra só gera QR Code quando essa configuração estiver salva.
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
          Este modo exige conta Asaas em produção, chave de API e webhook ativo.
          Use quando a empresa já quiser automação de baixa; para começar, Pix
          direto costuma ser mais simples.
        </div>
      )}

      {error ? (
        <div
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          className="mt-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4" />
          {manualPixReady
            ? "Recebimento salvo. Pix direto pronto para cobrar."
            : "Recebimento salvo."}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end border-t pt-4">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Salvando…" : "Salvar forma de recebimento"}
        </Button>
      </div>
    </form>
  );
}

function ProviderOption({
  checked,
  icon: Icon,
  title,
  badge,
  description,
  onClick,
}: {
  checked: boolean;
  icon: typeof WalletCards;
  title: string;
  badge: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={cn(
        "min-h-11 rounded-lg border p-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-4",
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "bg-background",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
            checked
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {badge}
        </span>
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs font-medium text-destructive">{errors[0]}</p>;
}

function paymentSignature(input: {
  provider: PaymentProvider;
  pixKeyType: PixKeyType;
  pixKey: string;
  pixReceiverName: string;
  pixReceiverCity: string;
  pixInstructions: string;
}) {
  return JSON.stringify({
    provider: input.provider,
    pixKeyType: input.pixKeyType,
    pixKey: input.pixKey.trim(),
    pixReceiverName: input.pixReceiverName.trim(),
    pixReceiverCity: input.pixReceiverCity.trim(),
    pixInstructions: input.pixInstructions.trim(),
  });
}
