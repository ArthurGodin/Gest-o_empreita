import Link from "next/link";
import {
  HardHat,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeIconButton } from "@/components/theme-control";

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
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[length:32px_32px]"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">
        <header className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <HardHat className="h-5 w-5" />
            </span>
            <span>Prumo</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeIconButton className="h-10 w-10" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 md:grid-cols-[0.92fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
              <SearchX className="h-4 w-4" />
              Página não encontrada
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
              Esse caminho não existe ou saiu do ar.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Se você recebeu um link de orçamento, peça ao prestador o link
              atualizado. Se estava usando o painel, volte para o início e
              continue de lá.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 px-6 text-base"
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
                className="h-12 bg-card px-6 text-base"
              >
                <Link href="/app">
                  <LayoutDashboard className="h-4 w-4" />
                  Abrir painel
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="h-12 px-5">
                <Link href="/ajuda">
                  <LifeBuoy aria-hidden="true" className="h-4 w-4" />
                  Central de Ajuda
                </Link>
              </Button>
            </div>
          </div>

          <aside className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-commercial">
                  Controle da obra
                </p>
                <p className="mt-1 text-xl font-black">Link indisponível</p>
              </div>
              <span className="rounded-md bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                404
              </span>
            </div>

            <dl className="mt-2 divide-y">
              {recoveryItems.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-1 py-4 sm:grid-cols-[7.5rem_1fr] sm:gap-4"
                >
                  <dt className="text-sm font-semibold text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-bold text-foreground">
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
