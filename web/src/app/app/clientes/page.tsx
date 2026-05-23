import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getCustomers } from "@/lib/queries/customers";
import { CustomerList } from "./customer-list";

export const metadata = {
  title: "Clientes — Gestão Empreita",
};

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="container space-y-6 py-6">
      <PageHeader
        title="Clientes"
        description="Sua agenda de clientes. Cadastre uma vez, use em qualquer orçamento ou obra."
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
          title="Ainda sem clientes por aqui"
          description="Cadastre seu primeiro cliente para começar a fazer orçamentos e obras."
          action={
            <Button asChild size="lg">
              <Link href="/app/clientes/novo">
                <Plus className="h-4 w-4" />
                Cadastrar primeiro cliente
              </Link>
            </Button>
          }
        />
      ) : (
        <CustomerList customers={customers} />
      )}
    </div>
  );
}
