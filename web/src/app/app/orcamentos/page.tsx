import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getQuotes } from "@/lib/queries/quotes";
import { QuoteList } from "./quote-list";

export const metadata = {
  title: "Orçamentos — Prumo",
};

export default async function QuotesPage() {
  const quotes = await getQuotes();

  return (
    <div className="mx-auto w-full max-w-[1184px] space-y-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <PageHeader
        title="Orçamentos"
        description="Crie, envie e acompanhe as propostas da sua empresa."
        actions={
          quotes.length > 0 ? (
            <Button asChild>
              <Link href="/app/orcamentos/novo">
                <Plus className="h-4 w-4" />
                Novo orçamento
              </Link>
            </Button>
          ) : null
        }
      />

      {quotes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Nenhum orçamento ainda"
          description="Crie seu primeiro orçamento profissional. Vai levar 5 minutos — e quando você mandar pelo WhatsApp, o cliente vai abrir um link bonito no celular pra aprovar."
          action={
            <Button asChild>
              <Link href="/app/orcamentos/novo">
                <Plus className="h-4 w-4" />
                Criar primeiro orçamento
              </Link>
            </Button>
          }
        />
      ) : (
        <QuoteList quotes={quotes} />
      )}
    </div>
  );
}
