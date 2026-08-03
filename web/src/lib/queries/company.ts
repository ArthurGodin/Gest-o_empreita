import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CompanyRole } from "@/lib/supabase/types";
import type { BusinessSegment } from "@/lib/business-segment";
import type { WorkspaceMode } from "@/lib/workspace-mode";
import type { ActivationGoal } from "@/lib/activation-goals";

export interface CompanyMembership {
  company_id: string;
  role: CompanyRole;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    business_segment: BusinessSegment;
    activation_goal: ActivationGoal | null;
    workspace_mode: WorkspaceMode;
  };
}

/**
 * Todas as empresas que o usuário atual é membro.
 * Cacheado por request (React cache).
 */
export const getUserCompanies = cache(async (): Promise<CompanyMembership[]> => {
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
        logo_url,
        business_segment,
        activation_goal,
        workspace_mode
      )
    `,
    );

  if (error) throw error;
  return (data ?? []) as unknown as CompanyMembership[];
});

/**
 * Empresa ativa do usuário (a primeira por enquanto — futuramente teremos
 * um switcher de empresa quando suportarmos multi-empresa por usuário).
 */
export const getActiveCompany = cache(
  async (): Promise<CompanyMembership | null> => {
    const memberships = await getUserCompanies();
    return memberships[0] ?? null;
  },
);

export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
