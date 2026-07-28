import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  normalizeWorkspaceMode,
  requireLiveWorkspace,
  type WorkspaceMode,
} from "@/lib/workspace-mode";

type SupabaseServer = SupabaseClient<Database>;

export async function getCompanyWorkspaceMode(
  supabase: SupabaseServer,
  companyId: string,
): Promise<WorkspaceMode> {
  const { data, error } = await supabase
    .from("companies")
    .select("workspace_mode")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Empresa nao encontrada para validar o ambiente.");

  return normalizeWorkspaceMode(data.workspace_mode);
}

export async function requireLiveCompanyWorkspace(
  supabase: SupabaseServer,
  companyId: string,
  operation: string,
): Promise<"live"> {
  const mode = await getCompanyWorkspaceMode(supabase, companyId);
  return requireLiveWorkspace(mode, operation);
}
