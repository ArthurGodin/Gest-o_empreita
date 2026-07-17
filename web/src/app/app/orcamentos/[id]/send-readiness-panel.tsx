import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ReadinessCheck {
  label: string;
  ok: boolean;
  help: string;
}

export function SendReadinessPanel({
  ready,
  blockers,
  checks,
}: {
  ready: boolean;
  blockers: string[];
  checks: ReadinessCheck[];
}) {
  return (
    <section
      className={
        ready
          ? "rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-950"
          : "rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-amber-950"
      }
      aria-label="Prontidão para envio"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={
              ready
                ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"
                : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700"
            }
          >
            {ready ? (
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <AlertCircle aria-hidden="true" className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">
              {ready ? "Pronto para enviar" : "Conclua antes de enviar"}
            </h2>
            <p className="mt-0.5 text-sm leading-5 opacity-85">
              {ready
                ? "O rascunho já atende aos requisitos do WhatsApp."
                : `${blockers.length} ${
                    blockers.length === 1
                      ? "ajuste pendente"
                      : "ajustes pendentes"
                  }. Próximo: ${blockers[0]}.`}
            </p>
          </div>
        </div>

        <details className="group relative shrink-0 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none touch-manipulation items-center justify-center rounded-md border border-current/15 bg-white/65 px-3 font-medium transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {ready ? "Ver conferência" : "Ver pendências"}
          </summary>
          <ul className="mt-3 grid gap-2 border-t border-current/15 pt-3 sm:absolute sm:right-0 sm:z-20 sm:w-[min(30rem,calc(100vw-2rem))] sm:rounded-lg sm:border sm:bg-background sm:p-4 sm:text-foreground sm:shadow-md">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-sm">
                {check.ok ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                  />
                ) : (
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                  />
                )}
                <span className="min-w-0">
                  <span className="block font-semibold">{check.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    {check.help}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
