import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronRight,
  ClipboardList,
  LifeBuoy,
  ShieldCheck,
  type LucideIcon,
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
  const showInternalOperations = hasOperationalAdminAccess(user);

  return (
    <PageContainer size="medium" spacing="compact">
      <PageHeader
        title="Configurações"
        description="Perfil, marca e dados que organizam seu espaço de trabalho e aparecem para clientes."
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
          {showInternalOperations ? (
            <>
              <SettingsLink
                href="/app/configuracoes/diagnostico"
                icon={BarChart3}
                title="Painel interno de produção"
                description="Checklist privado de venda, integrações, métricas e cobrança"
                badge="Admin"
              />
              <SettingsLink
                href="/app/configuracoes/saude-operacional"
                icon={Activity}
                title="Saúde operacional"
                description="Alertas privados de pagamento, assinatura, webhook e SINAPI"
                badge="Admin"
              />
            </>
          ) : null}
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
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-medium">{title}</span>
            {badge ? (
              <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                {badge}
              </span>
            ) : null}
          </div>
          <div className="text-xs leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>
      <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
