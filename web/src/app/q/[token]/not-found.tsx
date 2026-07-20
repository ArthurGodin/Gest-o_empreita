import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  HardHat,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Link de orçamento indisponível - Prumo",
};

const requestNewLinkHref = `https://wa.me/?text=${encodeURIComponent(
  "Olá, recebi um link de orçamento indisponível. Você pode me enviar o link atualizado?",
)}`;

export default function PublicQuoteNotFound() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex h-11 items-center justify-between border-b pb-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat aria-hidden="true" className="h-4 w-4" />
            </span>
            Prumo
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">
              <LayoutDashboard aria-hidden="true" />
              Painel
            </Link>
          </Button>
        </header>

        <div className="flex flex-1 items-center py-8">
          <section className="w-full rounded-lg border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-800">
              <AlertCircle aria-hidden="true" className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-balance text-2xl font-bold leading-tight">
              Este orçamento não está mais disponível
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A proposta pode ter sido atualizada, substituída ou removida. Peça
              ao prestador o link mais recente antes de aprovar ou pagar.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <a
                  href={requestNewLinkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" />
                  Pedir novo link
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft aria-hidden="true" />
                  Voltar ao início
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex items-start gap-3 border-t pt-4">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              />
              <p className="text-sm leading-5 text-muted-foreground">
                Confira se o novo link veio do contato do prestador e revise a
                proposta completa antes de tomar uma decisão.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
