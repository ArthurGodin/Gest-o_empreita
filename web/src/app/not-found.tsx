import Link from "next/link";
import { HardHat, Home, LayoutDashboard, LogIn, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Página não encontrada — Prumo",
};

const recoveryItems = [
  {
    label: "Próxima ação",
    value: "Use um link válido ou entre no painel.",
  },
  {
    label: "Segurança",
    value: "Links antigos podem ser invalidados pelo prestador.",
  },
  {
    label: "Cliente",
    value: "Solicite o orçamento reenviado no WhatsApp.",
  },
];

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fb] text-[#17202a]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(31,41,55,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(31,41,55,0.045)_1px,transparent_1px)] bg-[length:32px_32px]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">
        <header className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#059669] text-white shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span>Prumo</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 md:grid-cols-[0.92fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#d8e0ea] bg-white px-3 py-2 text-sm font-semibold text-[#374151] shadow-sm">
              <SearchX className="h-4 w-4" />
              Página não encontrada
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
              Esse caminho não existe ou saiu do ar.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#52606f] md:text-lg">
              Se você recebeu um link de orçamento, peça ao prestador o link
              atualizado. Se estava usando o painel, volte para o início e
              continue de lá.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-[#059669] px-6 text-base hover:bg-[#c85b17]"
              >
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Ir para o início
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 border-[#d8e0ea] bg-white px-6 text-base"
              >
                <Link href="/app">
                  <LayoutDashboard className="h-4 w-4" />
                  Abrir painel
                </Link>
              </Button>
            </div>
          </div>

          <aside className="rounded-xl border border-[#d8e0ea] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e3e8ef] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#c85b17]">
                  Controle da obra
                </p>
                <p className="mt-1 text-xl font-black">Link indisponível</p>
              </div>
              <span className="rounded-md bg-[#fee2e2] px-3 py-1 text-xs font-bold text-[#991b1b]">
                404
              </span>
            </div>

            <dl className="mt-2 divide-y divide-[#e3e8ef]">
              {recoveryItems.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-1 py-4 sm:grid-cols-[7.5rem_1fr] sm:gap-4"
                >
                  <dt className="text-sm font-semibold text-[#52606f]">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-bold text-[#17202a]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
