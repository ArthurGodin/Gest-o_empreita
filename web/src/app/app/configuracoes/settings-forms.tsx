"use client";

import { useState } from "react";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import type { CompanyFull } from "@/lib/queries/company-settings";
import { CompanyForm } from "./company-form";
import { LogoUpload } from "./logo-upload";
import { PaymentSettingsForm } from "./payment-settings-form";
import { ProfessionalProfileForm } from "./professional-profile-form";

export function SettingsForms({ company }: { company: CompanyFull }) {
  const [companyDirty, setCompanyDirty] = useState(false);
  const [paymentDirty, setPaymentDirty] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  return (
    <>
      <ProtectedFormNavigation
        dirty={companyDirty || paymentDirty || profileDirty}
        contentLabel="nesta tela de configurações"
      />
      <ProfessionalProfileForm
        initialSegment={company.business_segment}
        onDirtyChange={setProfileDirty}
      />
      <LogoUpload
        companyName={company.name}
        currentLogoUrl={company.logo_url}
      />
      <CompanyForm company={company} onDirtyChange={setCompanyDirty} />
      <PaymentSettingsForm
        company={company}
        onDirtyChange={setPaymentDirty}
      />
    </>
  );
}
