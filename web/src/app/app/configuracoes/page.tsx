import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronRight,
  ClipboardList,
  LifeBuoy,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { getActiveCompanyFull } from "@/lib/queries/company-settings";
import { getCurrentUser } from "@/lib/queries/company";
import { hasOperationalAdminAccess } from "@/lib/operations/operational-admin";
import { SettingsForms } from "./settings-forms";

export const metadata = {
  title: "Configurações — Prumo",
};

export default async function SettingsPage() {
  const company = await getActiveCompanyFull();
  if (!company) redirect("/onboarding");
  const user = await getCurrentUser();
  const showOperationalHealth = hasOperationalAdminAccess(user);

  return (
    <PageContainer size="medium" spacing="compact">
      <PageHeader
        title="Configurações"
        description="Dados da empresa que aparecem nos orçamentos enviados pra clientes."
      />

      <SettingsForms company={company} />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Mais ajustes
        </h2>
        <div className="divide-y rounded-lg border bg-card">
          <SettingsLink
            href="/ajuda"
            icon={LifeBuoy}
            title="Ajuda e suporte"
            description="Respostas rápidas e contato seguro com o Prumo"
          />
          <SettingsLink
            href="/app/configuracoes/diagnostico"
            icon={BarChart3}
            title="Diagnóstico de produção"
            description="Checklist para demo, venda, Analytics, Asaas, Resend e PDF"
          />
          {showOperationalHealth && (
            <SettingsLink
              href="/app/configuracoes/saude-operacional"
              icon={Activity}
              title="Saúde do Prumo"
              description="Monitor privado de pagamentos, assinaturas, webhook e SINAPI"
            />
          )}
          <SettingsLink
            href="/app/configuracoes/templates"
            icon={ClipboardList}
            title="Modelos de obra"
            description="Modelos de etapas pra acelerar a abertura de novas obras"
          />
        </div>
      </section>
    </PageContainer>
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
        <Icon aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-xs leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>
      <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
