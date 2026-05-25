import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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
}

export const getActiveCompanyFull = cache(
  async (): Promise<CompanyFull | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, legal_name, cnpj, phone, email, logo_url, address, city, state, zip_code",
      )
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as CompanyFull | null) ?? null;
  },
);
