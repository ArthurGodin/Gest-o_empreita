import { Package } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getCatalogItems } from "@/lib/queries/catalog";
import { getActiveCompany } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import { CatalogList } from "./catalog-list";
import { CreateFirstItem } from "./create-first-item";
import { CatalogImportDialog } from "./catalog-import-dialog";

export const metadata = {
  title: "Catálogo — Prumo",
};

export default async function CatalogPage() {
  const [items, activeCompany] = await Promise.all([
    getCatalogItems(),
    getActiveCompany(),
  ]);
  let currentPlan = "free";

  if (activeCompany) {
    const supabase = createClient();
    const { data } = await supabase
      .from("companies")
      .select("plan")
      .eq("id", activeCompany.company_id)
      .single();

    currentPlan = data?.plan ?? "free";
  }

  return (
    <PageContainer>
      <PageHeader
        title="Catálogo de itens"
        description="Reutilize serviços, materiais, unidades e preços nos seus orçamentos."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="Crie seu primeiro item padrão"
          description="Salve serviços e materiais recorrentes para reutilizar descrição, unidade e preço nos orçamentos."
          action={<CreateFirstItem />}
          secondaryAction={<CatalogImportDialog currentPlan={currentPlan} />}
        />
      ) : (
        <CatalogList items={items} currentPlan={currentPlan} />
      )}
    </PageContainer>
  );
}
