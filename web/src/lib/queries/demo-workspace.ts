import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DemoWorkspaceSnapshot } from "@/lib/demo-workspace";

export async function getDemoWorkspaceSnapshot(
  companyId: string,
): Promise<DemoWorkspaceSnapshot | null> {
  const supabase = createClient();
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, title, share_token, project_id")
    .eq("company_id", companyId)
    .ilike("title", "Demo -%")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (quoteError) throw quoteError;
  if (!quote?.share_token) return null;

  const projectQuery = supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId);
  const { data: project, error: projectError } = quote.project_id
    ? await projectQuery.eq("id", quote.project_id).maybeSingle()
    : await projectQuery
        .ilike("name", "Demo -%")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (projectError) throw projectError;
  if (!project) return null;

  return {
    quoteId: quote.id,
    quoteTitle: quote.title,
    shareToken: quote.share_token,
    projectId: project.id,
    projectName: project.name,
  };
}
