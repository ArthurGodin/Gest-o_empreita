import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="container max-w-3xl space-y-4 py-5 sm:py-6">
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
        title="Novo orçamento"
        description="Escolha o cliente e dê um título. Você adiciona os itens na tela seguinte."
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-6 w-6" />}
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
    </div>
  );
}
