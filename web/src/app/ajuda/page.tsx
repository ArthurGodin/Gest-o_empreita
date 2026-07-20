import Link from "next/link";
import { ArrowLeft, HardHat, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findHelpTopic } from "@/lib/help-center";
import { HelpCenter } from "./help-center";

export const metadata = {
  title: "Central de Ajuda - Prumo",
  description:
    "Respostas sobre clientes, orçamentos, SINAPI, obras, cobranças, planos e segurança no Prumo.",
};

export default async function HelpPage({
  searchParams,
}: {
  searchParams?: Promise<{ topico?: string }>;
}) {
  const params = await searchParams;
  const initialTopicId = findHelpTopic(params?.topico)?.id ?? null;

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link
            href="/"
            className="flex min-h-11 min-w-0 items-center gap-2.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <HardHat aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="truncate text-lg">Prumo</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft aria-hidden="true" />
                <span className="hidden min-[360px]:inline">Início</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app">
                <LayoutDashboard aria-hidden="true" />
                Painel
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <HelpCenter initialTopicId={initialTopicId} />
    </main>
  );
}
