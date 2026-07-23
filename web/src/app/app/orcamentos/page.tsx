import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getQuotes } from "@/lib/queries/quotes";
import { getActiveCompany } from "@/lib/queries/company";
import { getBusinessVocabulary } from "@/lib/business-segment";
import { QuoteList } from "./quote-list";

export const metadata = {
  title: "Propostas e orçamentos — Prumo",
};

export default async function QuotesPage() {
  const [quotes, company] = await Promise.all([
    getQuotes(),
    getActiveCompany(),
  ]);
  const vocabulary = getBusinessVocabulary(
    company?.company.business_segment,
  );

  return (
    <PageContainer>
      <PageHeader
        title={vocabulary.quotePlural}
        description={`Crie, envie e acompanhe ${vocabulary.quotePluralLower} profissionais em um só lugar.`}
        actions={
          quotes.length > 0 ? (
            <Button asChild>
              <Link href="/app/orcamentos/novo">
                <Plus className="h-4 w-4" />
                {vocabulary.newQuoteLabel}
              </Link>
            </Button>
          ) : null
        }
      />

      {quotes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={`Crie ${
            vocabulary.quoteSingular === "Proposta"
              ? "sua primeira proposta"
              : "seu primeiro orçamento"
          }`}
          description="Escolha um modelo ou comece em branco, revise os valores e envie um link para aprovação pelo celular."
          action={
            <Button asChild>
              <Link href="/app/orcamentos/novo">
                <Plus className="h-4 w-4" />
                {vocabulary.createQuoteLabel}
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
