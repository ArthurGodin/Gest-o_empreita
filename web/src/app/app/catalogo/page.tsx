import { Package } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { getCatalogItems } from "@/lib/queries/catalog";
import { getActiveCompany } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import { CatalogList } from "./catalog-list";
import { CreateFirstItem } from "./create-first-item";

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
          action={<CreateFirstItem currentPlan={currentPlan} />}
        />
      ) : (
        <CatalogList items={items} currentPlan={currentPlan} />
      )}
    </div>
  );
}
