import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { CustomerForm } from "../customer-form";

export const metadata = {
  title: "Novo cliente — Prumo",
};

export default function NewCustomerPage() {
  return (
    <div className="container max-w-3xl space-y-6 py-6">
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
        title="Novo cliente"
        description="Só o nome é obrigatório. O resto você pode preencher depois."
      />

      <CustomerForm />
    </div>
  );
}
