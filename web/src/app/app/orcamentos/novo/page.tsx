import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getCustomers } from "@/lib/queries/customers";
import { NewQuoteForm } from "./new-quote-form";

export const metadata = {
  title: "Novo orçamento — Prumo",
};

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: Promise<{ cliente?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const customers = await getCustomers();
  const selectedCustomerId = customers.some(
    (customer) => customer.id === query.cliente,
  )
    ? query.cliente
    : undefined;

  return (
    <PageContainer size="narrow" spacing="compact">
      <div>
        <Link
          href="/app/orcamentos"
          className="-ml-2 inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Voltar para orçamentos
        </Link>
      </div>

      <PageHeader
        title="Novo orçamento"
        description="Escolha o cliente e dê um título. Você adiciona os itens na tela seguinte."
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={<Plus aria-hidden="true" className="h-6 w-6" />}
          title="Sem clientes cadastrados"
          description="Pra criar um orçamento, primeiro cadastre o cliente. É rápido."
          action={
            <Button asChild>
              <Link href="/app/clientes/novo?after=quote">
                Cadastrar primeiro cliente
              </Link>
            </Button>
          }
        />
      ) : (
        <NewQuoteForm
          customers={customers}
          selectedCustomerId={selectedCustomerId}
        />
      )}
    </PageContainer>
  );
}
