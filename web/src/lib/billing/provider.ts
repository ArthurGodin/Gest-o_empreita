import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  generateManualPixForCharge,
  getCompanyPaymentSettings,
  isManualPixReady,
} from "./manual-pix";
import {
  generatePixForCharge,
  type BillingCustomer,
  type CreateChargeResult,
} from "./asaas";

type SupabaseServer = SupabaseClient<Database>;

export async function companyUsesManualPix(
  supabase: SupabaseServer,
  companyId: string,
): Promise<boolean> {
  const settings = await getCompanyPaymentSettings(supabase, companyId);
  return isManualPixReady(settings);
}

export async function companyPrefersManualPix(
  supabase: SupabaseServer,
  companyId: string,
): Promise<boolean> {
  const settings = await getCompanyPaymentSettings(supabase, companyId);
  return settings.payment_provider === "manual_pix";
}

export async function generatePreferredPixForCharge(
  supabase: SupabaseServer,
  params: {
    chargeId: string;
    companyId: string;
    customer: BillingCustomer;
    cpfCnpjOverride?: string | null;
    description: string;
  },
): Promise<CreateChargeResult> {
  const settings = await getCompanyPaymentSettings(supabase, params.companyId);

  if (settings.payment_provider === "manual_pix") {
    return generateManualPixForCharge(supabase, {
      chargeId: params.chargeId,
      companyId: params.companyId,
      description: params.description,
    });
  }

  return generatePixForCharge(supabase, params);
}
