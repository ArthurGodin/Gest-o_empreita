import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lista todos os clientes da empresa ativa.
 * RLS faz o filtro por tenant — só vem o que o usuário tem permissão de ver.
 */
export const getCustomers = cache(async (): Promise<Customer[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Customer[];
});

export const getCustomer = cache(
  async (id: string): Promise<Customer | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as Customer | null) ?? null;
  },
);
