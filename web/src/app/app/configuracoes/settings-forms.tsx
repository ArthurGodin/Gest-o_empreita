"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { ThemeSettings } from "@/components/theme-control";
import { Button } from "@/components/ui/button";
import type { CompanyFull } from "@/lib/queries/company-settings";
import { isDemoWorkspace } from "@/lib/workspace-mode";
import { CompanyForm } from "./company-form";
import { LogoUpload } from "./logo-upload";
import { PaymentSettingsForm } from "./payment-settings-form";
import { ProfessionalProfileForm } from "./professional-profile-form";

export function SettingsForms({ company }: { company: CompanyFull }) {
  const [companyDirty, setCompanyDirty] = useState(false);
  const [paymentDirty, setPaymentDirty] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const isDemo = isDemoWorkspace(company.workspace_mode);

  return (
    <>
      <ProtectedFormNavigation
        dirty={companyDirty || paymentDirty || profileDirty}
        contentLabel="nesta tela de configurações"
      />
      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Aparência</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Escolha como o Prumo aparece neste dispositivo.
          </p>
        </div>
        <ThemeSettings />
      </section>
      <ProfessionalProfileForm
        initialSegment={company.business_segment}
        onDirtyChange={setProfileDirty}
      />
      <LogoUpload
        companyName={company.name}
        currentLogoUrl={company.logo_url}
      />
      <CompanyForm company={company} onDirtyChange={setCompanyDirty} />
      {isDemo ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-foreground">
                Pagamentos reais protegidos
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Chaves Pix, taxas e cobranças ficam desativadas nesta conta de
                demonstração. Assim, você pode explorar o Prumo sem movimentar
                dinheiro ou alterar uma configuração financeira real.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/app/demonstracao">Voltar à demonstração</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <PaymentSettingsForm
          company={company}
          onDirtyChange={setPaymentDirty}
        />
      )}
    </>
  );
}
