import "server-only";

import { cache } from "react";
import { normalizeBusinessSegment, type BusinessSegment } from "@/lib/business-segment";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicProjectAccessKind = "quote" | "project";

export interface PublicProjectAccess {
  projectId: string;
  kind: PublicProjectAccessKind;
}

export interface PublicDirectProjectIdentity {
  projectId: string;
  projectName: string;
  companyName: string;
  companyLogoUrl: string | null;
  businessSegment: BusinessSegment;
}

export const resolvePublicProjectAccess = cache(
  async (token: string): Promise<PublicProjectAccess | null> => {
    if (!isPublicAccessToken(token)) return null;

    const admin = createAdminClient();
    const [quoteResult, projectResult] = await Promise.all([
      admin
        .from("quotes")
        .select("project_id,status")
        .eq("share_token", token)
        .maybeSingle(),
      admin
        .from("projects")
        .select("id,creation_source")
        .eq("client_access_token", token)
        .maybeSingle(),
    ]);

    return selectPublicProjectAccess({
      quote: quoteResult.error ? null : quoteResult.data,
      project: projectResult.error ? null : projectResult.data,
    });
  },
);

export const getPublicDirectProjectIdentity = cache(
  async (token: string): Promise<PublicDirectProjectIdentity | null> => {
    const access = await resolvePublicProjectAccess(token);
    if (!access || access.kind !== "project") return null;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("projects")
      .select(
        "id,name,company:companies(name,logo_url,business_segment)",
      )
      .eq("id", access.projectId)
      .eq("creation_source", "direct")
      .maybeSingle();

    if (error || !data) return null;

    const company = firstRelation(data.company);
    if (!company) return null;

    return {
      projectId: data.id,
      projectName: data.name,
      companyName: company.name,
      companyLogoUrl: company.logo_url,
      businessSegment: normalizeBusinessSegment(company.business_segment),
    };
  },
);

function isPublicAccessToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{32,256}$/.test(value);
}

export function selectPublicProjectAccess(input: {
  quote: { project_id: string | null; status: string } | null;
  project: { id: string; creation_source: string } | null;
}): PublicProjectAccess | null {
  const quoteProjectId =
    input.quote?.status === "approved" ? input.quote.project_id : null;
  const directProjectId =
    input.project?.creation_source === "direct" ? input.project.id : null;

  if (Boolean(quoteProjectId) === Boolean(directProjectId)) return null;

  return quoteProjectId
    ? { projectId: quoteProjectId, kind: "quote" }
    : { projectId: directProjectId!, kind: "project" };
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
