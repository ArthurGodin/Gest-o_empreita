import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { getCustomers } from "@/lib/queries/customers";
import { getQuoteWithRelations } from "@/lib/queries/quotes";
import { listTemplates } from "@/lib/queries/stage-templates";
import { isEditable, STATUS_LABEL } from "@/lib/quote-status";
import { QuoteEditor } from "./quote-editor";
import { QuoteView } from "./quote-view";
import { DeleteQuoteButton } from "./delete-quote-button";
import { DuplicateButton } from "./duplicate-button";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const quote = await getQuoteWithRelations(params.id);
  return {
    title: quote
      ? `${quote.number} ${quote.title} — Orçamentos`
      : "Orçamento não encontrado",
  };
}

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const quote = await getQuoteWithRelations(params.id);
  if (!quote) notFound();

  const editable = isEditable(quote.status);
  const showConvert =
    quote.effective_status === "approved" && !quote.project_id;
  const [customers, templates] = await Promise.all([
    editable ? getCustomers() : Promise.resolve([]),
    showConvert ? listTemplates() : Promise.resolve([]),
  ]);

  return (
    <div className="container max-w-5xl space-y-6 py-6">
      <div>
        <Link
          href="/app/orcamentos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para orçamentos
        </Link>
      </div>

      <PageHeader
        title={`${quote.number} · ${quote.title}`}
        description={
          editable
            ? "Monte o orçamento, salve, e quando estiver pronto clique em Enviar pro cliente."
            : `Esse orçamento está como "${STATUS_LABEL[quote.effective_status]}". Para mudar, duplique em um novo rascunho.`
        }
        actions={
          <div className="flex items-center gap-2">
            <DuplicateButton id={quote.id} />
            {editable && <DeleteQuoteButton id={quote.id} number={quote.number} />}
          </div>
        }
      />

      {editable ? (
        <QuoteEditor quote={quote} customers={customers} />
      ) : (
        <QuoteView quote={quote} templates={templates} />
      )}
    </div>
  );
}
