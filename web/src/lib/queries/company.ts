import { createClient } from "@/lib/supabase/server";

export interface CompanyMembership {
  company_id: string;
  role: "owner" | "manager" | "foreman" | "worker";
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export async function getUserCompanies(): Promise<CompanyMembership[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      company_id,
      role,
      company:companies (
        id,
        name,
        logo_url
      )
    `,
    )
    .throwOnError();

  if (error) throw error;
  return (data ?? []) as unknown as CompanyMembership[];
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
