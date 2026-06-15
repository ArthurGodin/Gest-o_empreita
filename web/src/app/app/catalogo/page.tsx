import { Package } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getCatalogItems } from "@/lib/queries/catalog";
import { CatalogList } from "./catalog-list";
import { CreateFirstItem } from "./create-first-item";

export const metadata = {
  title: "Catálogo — Gestão Empreita",
};

export default async function CatalogPage() {
  const items = await getCatalogItems();

  return (
    <div className="container space-y-6 py-6">
      <PageHeader
        title="Catálogo de itens"
        description="Itens que você usa muito (telhas, mão de obra, mantas…). Cadastre uma vez, use em qualquer orçamento."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="Catálogo vazio"
          description="Cadastre itens recorrentes para montar orçamentos mais rápido e manter preços consistentes. Você também pode salvar um item no catálogo enquanto cria uma proposta."
          action={<CreateFirstItem />}
        />
      ) : (
        <CatalogList items={items} />
      )}
    </div>
  );
}
