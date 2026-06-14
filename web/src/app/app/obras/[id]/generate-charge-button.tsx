"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { trackProductEvent } from "@/lib/product-analytics";
import { generateChargePixAction } from "./actions";

interface GenerateChargeButtonProps {
  chargeId: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}

export function GenerateChargeButton({
  chargeId,
  label = "Gerar Pix",
  size = "sm",
  variant = "outline",
  className,
}: GenerateChargeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateChargePixAction(chargeId);
      if (!result.ok) {
        setError(result.error);
        toast({
          variant: "destructive",
          title: "Pix não gerado",
          description: result.error,
        });
        return;
      }
      trackProductEvent("billing_pix_generated", {
        label,
      });
      toast({
        title: "Pix gerado",
        description:
          "A cobrança foi atualizada. Agora você pode copiar o Pix ou abrir o link do Asaas.",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={generate}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <QrCode className="h-3.5 w-3.5" />
        )}
        {pending ? "Gerando…" : label}
      </Button>
      {error ? (
        <p className="max-w-sm text-xs leading-5 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
