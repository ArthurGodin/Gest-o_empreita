import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { CustomerForm } from "../customer-form";

export const metadata = {
  title: "Novo cliente — Prumo",
};

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams?: Promise<{ after?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const continueToQuote = query.after === "quote";

  return (
    <PageContainer size="medium" spacing="compact">
      <div>
        <Link
          href={continueToQuote ? "/app/orcamentos/novo" : "/app/clientes"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {continueToQuote ? "Voltar para orçamento" : "Voltar para clientes"}
        </Link>
      </div>

      <PageHeader
        title="Novo cliente"
        description={
          continueToQuote
            ? "Cadastre o cliente agora. Depois você volta direto para criar o orçamento dele."
            : "Só o nome é obrigatório. O resto você pode preencher depois."
        }
      />

      <CustomerForm
        cancelHref={continueToQuote ? "/app/orcamentos/novo" : "/app/clientes"}
        afterCreate={continueToQuote ? "quote" : "customer"}
      />
    </PageContainer>
  );
}
