"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/product-analytics";

/**
 * Error boundary global da área autenticada.
 * Captura qualquer erro não tratado em RSC/client components dentro de /app/*.
 *
 * Conforme CLAUDE.MD: "Error boundaries no frontend — usuário nunca vê tela branca".
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção, enviar para Sentry/PostHog aqui
    trackProductEvent("app_error_boundary", {
      digest: error.digest ?? null,
    });
    console.error("[app-error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground leading-6">
          Ocorreu um erro inesperado. Se o problema persistir, saia e entre
          novamente ou entre em contato com o suporte.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="default">
            Tentar novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/app")}
          >
            Voltar ao início
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono mt-4">
            Código: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
