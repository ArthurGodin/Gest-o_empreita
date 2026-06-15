import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PaymentProvider, PixKeyType } from "@/lib/supabase/types";

export interface CompanyFull {
  id: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  payment_provider: PaymentProvider;
  pix_key_type: PixKeyType | null;
  pix_key: string | null;
  pix_receiver_name: string | null;
  pix_receiver_city: string | null;
  pix_instructions: string | null;
}

export const getActiveCompanyFull = cache(
  async (): Promise<CompanyFull | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, legal_name, cnpj, phone, email, logo_url, address, city, state, zip_code, payment_provider, pix_key_type, pix_key, pix_receiver_name, pix_receiver_city, pix_instructions",
      )
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as CompanyFull | null) ?? null;
  },
);
