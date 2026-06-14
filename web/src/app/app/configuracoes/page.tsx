import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, ChevronRight, ClipboardList } from "lucide-react";
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

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Mais ajustes
        </h2>
        <div className="space-y-2">
          <SettingsLink
            href="/app/configuracoes/diagnostico"
            icon={BarChart3}
            title="Diagnóstico de produção"
            description="Checklist para demo, venda, Analytics, Asaas, Resend e PDF"
          />
          <SettingsLink
            href="/app/configuracoes/templates"
            icon={ClipboardList}
            title="Templates de obra"
            description="Modelos de etapas pra acelerar a abertura de novas obras"
          />
        </div>
      </section>
    </div>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof ClipboardList;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-muted/20"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
