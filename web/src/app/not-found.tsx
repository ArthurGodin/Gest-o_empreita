import Link from "next/link";
import { HardHat, Home, LayoutDashboard, LogIn, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <main className="min-h-screen bg-[#fffaf3] text-[#25170f]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">
        <header className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#db5b18] text-white shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span>Gestão Empreita</span>
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
            <div className="inline-flex items-center gap-2 rounded-md border border-[#e4c39e] bg-white px-3 py-2 text-sm font-medium text-[#7a3b12] shadow-sm">
              <SearchX className="h-4 w-4" />
              Página não encontrada
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
              Esse caminho não existe ou saiu do ar.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#6f5a49] md:text-lg">
              Se você recebeu um link de orçamento, peça ao prestador o link
              atualizado. Se estava usando o painel, volte para o início e
              continue de lá.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-[#db5b18] px-6 text-base hover:bg-[#bc4810]"
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
                className="h-12 border-[#d7b893] bg-white px-6 text-base"
              >
                <Link href="/app">
                  <LayoutDashboard className="h-4 w-4" />
                  Abrir painel
                </Link>
              </Button>
            </div>
          </div>

          <aside className="rounded-xl border border-[#eadcc9] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#eadcc9] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#db5b18]">
                  Controle da obra
                </p>
                <p className="mt-1 text-xl font-black">Link indisponível</p>
              </div>
              <span className="rounded-md bg-[#fee2e2] px-3 py-1 text-xs font-bold text-[#991b1b]">
                404
              </span>
            </div>

            <dl className="mt-2 divide-y divide-[#eadcc9]">
              {recoveryItems.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-1 py-4 sm:grid-cols-[7.5rem_1fr] sm:gap-4"
                >
                  <dt className="text-sm font-semibold text-[#6f5a49]">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-bold text-[#25170f]">
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
