"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/product-analytics";

/**
 * Error boundary global do site (landing, auth, etc).
 * Captura erros em rotas fora de /app/* para nunca mostrar tela branca.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackProductEvent("global_error_boundary", {
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Algo deu errado
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Ocorreu um erro inesperado. Tente novamente ou volte para a página
            inicial.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={reset}>Tentar novamente</Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Página inicial
            </Button>
          </div>
          {error?.digest && (
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Código: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
