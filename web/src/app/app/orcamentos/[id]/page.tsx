import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getCustomers } from "@/lib/queries/customers";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import { getQuoteRevisions, getQuoteWithRelations } from "@/lib/queries/quotes";
import { listTemplates } from "@/lib/queries/stage-templates";
import { isEditable, STATUS_LABEL } from "@/lib/quote-status";
import { QuoteEditor } from "./quote-editor";
import { QuoteView } from "./quote-view";
import { DeleteQuoteButton } from "./delete-quote-button";
import { DuplicateButton } from "./duplicate-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuoteWithRelations(id);
  return {
    title: quote
      ? `${quote.number} ${quote.title} — Orçamentos`
      : "Orçamento não encontrado",
  };
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ revisao?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const quote = await getQuoteWithRelations(id);
  if (!quote) notFound();

  const editable = isEditable(quote.status);
  const showConvert =
    quote.effective_status === "approved" && !quote.project_id;
  const queryRevisionSourceId =
    typeof query.revisao === "string" ? query.revisao : null;
  const persistedRevisionSourceId = quote.revision_source_id ?? null;
  const revisionSourceId = editable
    ? persistedRevisionSourceId ?? queryRevisionSourceId
    : null;

  const [customers, templates, revisionSource, revisions, company] = await Promise.all([
    editable ? getCustomers() : Promise.resolve([]),
    showConvert ? listTemplates() : Promise.resolve([]),
    revisionSourceId && revisionSourceId !== quote.id
      ? getQuoteWithRelations(revisionSourceId)
      : Promise.resolve(null),
    quote.effective_status === "rejected"
      ? getQuoteRevisions(quote.id)
      : Promise.resolve([]),
    showConvert ? getActiveCompanyFull() : Promise.resolve(null),
  ]);
  const validRevisionSource =
    revisionSource?.effective_status === "rejected" &&
    revisionSource.customer_id === quote.customer_id
      ? revisionSource
      : null;
  const latestRevision = revisions[0] ?? null;

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
          validRevisionSource
            ? `Revisão em edição a partir do pedido de mudanças em ${validRevisionSource.number}. Ajuste, salve e envie novamente.`
            : editable
            ? "Monte o orçamento, salve, e quando estiver pronto envie pelo WhatsApp."
            : quote.effective_status === "rejected"
              ? "O cliente pediu mudanças. Crie uma revisão para ajustar sem perder o histórico da recusa."
              : `Esse orçamento está como "${STATUS_LABEL[quote.effective_status]}". Para mudar, duplique em um novo rascunho.`
        }
        actions={
          <div className="flex items-center gap-2">
            {latestRevision && quote.effective_status === "rejected" && (
              <Button asChild>
                <Link href={`/app/orcamentos/${latestRevision.id}`}>
                  Abrir revisão
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {!(latestRevision && quote.effective_status === "rejected") && (
              <DuplicateButton
                id={quote.id}
                intent={
                  quote.effective_status === "rejected" ? "revision" : "copy"
                }
                label={
                  quote.effective_status === "rejected"
                    ? "Ajustar e reenviar"
                    : "Duplicar"
                }
              />
            )}
            {editable && <DeleteQuoteButton id={quote.id} number={quote.number} />}
          </div>
        }
      />

      {editable ? (
        <QuoteEditor
          quote={quote}
          customers={customers}
          revisionSource={validRevisionSource}
        />
      ) : (
        <QuoteView
          quote={quote}
          revisions={revisions}
          templates={templates}
          paymentProvider={company?.payment_provider ?? "asaas"}
        />
      )}
    </div>
  );
}
