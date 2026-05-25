import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import { CompanyForm } from "./company-form";
import { LogoUpload } from "./logo-upload";

export const metadata = {
  title: "Configurações — Gestão Empreita",
};

export default async function SettingsPage() {
  const company = await getActiveCompanyFull();
  if (!company) redirect("/onboarding");

  return (
    <div className="container max-w-3xl space-y-6 py-6">
      <PageHeader
        title="Configurações"
        description="Dados da empresa que aparecem nos orçamentos enviados pra clientes."
      />

      <LogoUpload
        companyName={company.name}
        currentLogoUrl={company.logo_url}
      />

      <CompanyForm company={company} />
    </div>
  );
}
