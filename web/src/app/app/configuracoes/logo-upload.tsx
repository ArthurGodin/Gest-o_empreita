"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadCompanyLogoAction } from "./actions";

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

interface LogoUploadProps {
  companyName: string;
  currentLogoUrl: string | null;
}

export function LogoUpload({ companyName, currentLogoUrl }: LogoUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);

  function onFile(file: File | null) {
    if (!file) return;
    setError(null);

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setError("Formato não suportado. Use PNG, JPG ou WEBP.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setError("Logo muito grande. Use uma imagem de até 2MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Preview local imediato
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.set("logo", file);

    startTransition(async () => {
      try {
        const result = await uploadCompanyLogoAction(formData);
        if (!result.ok) {
          setError(result.error);
          setPreview(currentLogoUrl); // rollback preview
          return;
        }
        setPreview(result.url);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch (e) {
        console.error("[logo-upload] action threw:", e);
        setError(
          "Não foi possível enviar a logo. Use uma imagem de até 2MB e tente novamente.",
        );
        setPreview(currentLogoUrl);
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Logo da empresa
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Aparece no link público do orçamento e no PDF. PNG, JPG ou WEBP. Máximo 2MB.
        A imagem é redimensionada pra 256×256 automaticamente.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={companyName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary text-2xl font-bold text-primary-foreground">
              {companyName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            disabled={pending}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {currentLogoUrl ? (
              <Camera className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {pending
              ? "Enviando…"
              : currentLogoUrl
                ? "Trocar logo"
                : "Adicionar logo"}
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
