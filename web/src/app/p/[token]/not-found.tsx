import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { ThemeIconButton } from "@/components/theme-control";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Briefing indisponível - Prumo",
};

export default function PublicProjectNotFound() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex h-11 items-center justify-between border-b pb-4">
          <Link href="/" className="font-semibold">
            Prumo
          </Link>
          <ThemeIconButton className="h-10 w-10" />
        </header>

        <div className="flex flex-1 items-center py-8">
          <section className="w-full rounded-lg border bg-card p-5 sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertCircle aria-hidden="true" className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-balance text-2xl font-bold leading-tight">
              Este briefing não está disponível
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              O responsável pode ter gerado um novo link, arquivado o briefing
              ou encerrado o projeto. Solicite o acesso mais recente.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                Voltar ao Prumo
              </Link>
            </Button>
            <div className="mt-6 flex items-start gap-3 border-t pt-4">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              />
              <p className="text-sm leading-5 text-muted-foreground">
                O link não revela valores, cobranças, custos ou informações
                internas do projeto.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
