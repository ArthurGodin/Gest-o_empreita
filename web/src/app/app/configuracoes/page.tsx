import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, ChevronRight, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import { CompanyForm } from "./company-form";
import { LogoUpload } from "./logo-upload";
import { PaymentSettingsForm } from "./payment-settings-form";

export const metadata = {
  title: "Configurações — Prumo",
};

export default async function SettingsPage() {
  const company = await getActiveCompanyFull();
  if (!company) redirect("/onboarding");

  return (
    <div className="container max-w-4xl space-y-4 py-5 sm:py-6">
      <PageHeader
        title="Configurações"
        description="Dados da empresa que aparecem nos orçamentos enviados pra clientes."
      />

      <LogoUpload
        companyName={company.name}
        currentLogoUrl={company.logo_url}
      />

      <CompanyForm company={company} />

      <PaymentSettingsForm company={company} />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Mais ajustes
        </h2>
        <div className="divide-y rounded-lg border bg-card">
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
      className="flex min-h-16 items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-xs leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
