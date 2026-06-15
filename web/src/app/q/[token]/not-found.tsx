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
  title: "Link de orçamento indisponível — Gestão Empreita",
};

const requestNewLinkHref =
  `https://wa.me/?text=${encodeURIComponent(
    "Olá, recebi um link de orçamento indisponível. Você pode me enviar o link atualizado?",
  )}`;

export default function PublicQuoteNotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fb] text-[#17202a]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(31,41,55,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(31,41,55,0.045)_1px,transparent_1px)] bg-[length:32px_32px]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#df6b21] text-white shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span>Gestão Empreita</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">
              <LayoutDashboard className="h-4 w-4" />
              Painel
            </Link>
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#d8e0ea] bg-white px-3 py-2 text-sm font-semibold text-[#374151] shadow-sm">
              <AlertCircle className="h-4 w-4" />
              Link indisponível
            </div>

            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-normal sm:text-5xl">
              Este orçamento foi atualizado ou saiu do ar.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#52606f]">
              O prestador pode ter gerado uma versão nova, corrigido a proposta
              ou removido o acesso antigo por segurança. Antes de aprovar,
              recusar ou pagar qualquer valor, peça o link atualizado.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-[#df6b21] px-6 text-base hover:bg-[#c85b17]"
              >
                <a
                  href={requestNewLinkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Pedir novo link
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 border-[#d8e0ea] bg-white px-6 text-base"
              >
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao início
                </Link>
              </Button>
            </div>
          </div>

          <aside className="rounded-lg border border-[#d8e0ea] bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3 border-b border-[#e3e8ef] pb-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#218653]" />
              <div>
                <p className="font-semibold">Como seguir com segurança</p>
                <p className="mt-1 text-sm leading-6 text-[#52606f]">
                  Use sempre o link mais recente enviado pelo prestador.
                </p>
              </div>
            </div>

            <ol className="mt-4 space-y-3 text-sm leading-6">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#fff4eb] text-xs font-bold text-[#c85b17]">
                  1
                </span>
                <span>Confira se o link veio do WhatsApp do prestador.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#fff4eb] text-xs font-bold text-[#c85b17]">
                  2
                </span>
                <span>Peça reenvio se o orçamento foi ajustado ou expirou.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#fff4eb] text-xs font-bold text-[#c85b17]">
                  3
                </span>
                <span>Aprove ou pague somente depois de ver a proposta completa.</span>
              </li>
            </ol>
          </aside>
        </section>
      </div>
    </main>
  );
}
