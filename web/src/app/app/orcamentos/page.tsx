import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
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
    <PageContainer>
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
          title="Crie sua primeira proposta"
          description="Adicione os serviços e envie um link para o cliente revisar e aprovar pelo celular."
          action={
            <Button asChild>
              <Link href="/app/orcamentos/novo">
                <Plus className="h-4 w-4" />
                Criar orçamento
              </Link>
            </Button>
          }
        />
      ) : (
        <QuoteList quotes={quotes} />
      )}
    </PageContainer>
  );
}
