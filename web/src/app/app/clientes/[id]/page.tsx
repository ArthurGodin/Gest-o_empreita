import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getCustomer } from "@/lib/queries/customers";
import { CustomerForm } from "../customer-form";
import { DeleteCustomer } from "./delete-customer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  return {
    title: customer
      ? `${customer.name} — Clientes`
      : "Cliente não encontrado — Prumo",
  };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <PageContainer size="medium" spacing="compact">
      <div>
        <Link
          href="/app/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para clientes
        </Link>
      </div>

      <PageHeader
        title={customer.name}
        description="Edite os dados do cliente. Salvar atualiza tudo de uma vez."
        actions={
          <>
            <Button asChild>
              <Link href={`/app/orcamentos/novo?cliente=${customer.id}`}>
                <FileText className="h-4 w-4" />
                Criar orçamento
              </Link>
            </Button>
            <DeleteCustomer id={customer.id} customerName={customer.name} />
          </>
        }
      />

      <CustomerForm customer={customer} />
    </PageContainer>
  );
}
