import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getCustomers } from "@/lib/queries/customers";
import { CustomerList } from "./customer-list";

export const metadata = {
  title: "Clientes — Prumo",
};

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        description="Cadastre uma vez e reutilize os dados em orçamentos e obras."
        actions={
          customers.length > 0 ? (
            <Button asChild>
              <Link href="/app/clientes/novo">
                <Plus className="h-4 w-4" />
                Novo cliente
              </Link>
            </Button>
          ) : null
        }
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="Cadastre seu primeiro cliente"
          description="Os dados serão reutilizados nas propostas e obras, sem precisar digitar tudo novamente."
          action={
            <Button asChild>
              <Link href="/app/clientes/novo">
                <Plus className="h-4 w-4" />
                Cadastrar cliente
              </Link>
            </Button>
          }
        />
      ) : (
        <CustomerList customers={customers} />
      )}
    </PageContainer>
  );
}
