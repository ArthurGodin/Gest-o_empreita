"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface CopyButtonProps
  extends Omit<ButtonProps, "onClick" | "type" | "children"> {
  text: string;
  label: string;
  copiedLabel?: string;
  successTitle?: string;
  successDescription?: string;
}

export function CopyButton({
  text,
  label,
  copiedLabel = "Copiado",
  successTitle = "Copiado",
  successDescription,
  className,
  disabled,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text.trim()) return;

    try {
      await copyText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast({
        title: successTitle,
        description: successDescription,
      });
    } catch {
      toast({
        title: "Não consegui copiar",
        description: "Selecione o texto manualmente e copie pelo navegador.",
        variant: "destructive",
      });
    }
  }

  return (
    <Button
      type="button"
      onClick={handleCopy}
      disabled={disabled || !text.trim()}
      className={cn("shrink-0", className)}
      {...props}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("copy failed");
}
