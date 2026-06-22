"use client";

import { Button } from "@/components/ui/button";

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
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold text-[#121826]">
            Algo deu errado
          </h2>
          <p className="text-sm text-[#475569] leading-6">
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
            <p className="text-xs text-[#94a3b8] font-mono mt-4">
              Código: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
