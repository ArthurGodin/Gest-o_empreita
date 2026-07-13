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
    <div className="container max-w-6xl space-y-5 py-5 sm:space-y-6 sm:py-6">
      <PageHeader
        title="Orçamentos"
        description="Todos os orçamentos da sua empresa. Crie, envie pra cliente aprovar, e quando ele aceitar vira obra com 1 clique."
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
            <Button asChild size="lg">
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
