import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ProjectSpacePriority,
  ProjectSpaceRequirementKind,
  ProjectSpaceRequirementStatus,
  ProjectSpaceStatus,
} from "@/lib/supabase/types";

export interface ProjectSpaceRequirement {
  id: string;
  companyId: string;
  projectId: string;
  spaceId: string;
  kind: ProjectSpaceRequirementKind;
  description: string;
  priority: ProjectSpacePriority;
  status: ProjectSpaceRequirementStatus;
  sourceRevisionId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSpace {
  id: string;
  companyId: string;
  projectId: string;
  name: string;
  spaceType: string;
  areaM2: number | null;
  priority: ProjectSpacePriority;
  status: ProjectSpaceStatus;
  notes: string | null;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requirements: ProjectSpaceRequirement[];
}

export const getProjectSpaces = cache(
  async (
    projectId: string,
    options?: { includeArchived?: boolean },
  ): Promise<ProjectSpace[]> => {
    const supabase = createClient();
    let spacesQuery = supabase
      .from("project_spaces")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (!options?.includeArchived) {
      spacesQuery = spacesQuery.is("archived_at", null);
    }

    const [spacesResult, requirementsResult] = await Promise.all([
      spacesQuery,
      supabase
        .from("project_space_requirements")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (spacesResult.error) throw spacesResult.error;
    if (requirementsResult.error) throw requirementsResult.error;

    const requirementsBySpace = new Map<
      string,
      ProjectSpaceRequirement[]
    >();
    for (const row of requirementsResult.data ?? []) {
      const requirement: ProjectSpaceRequirement = {
        id: row.id,
        companyId: row.company_id,
        projectId: row.project_id,
        spaceId: row.space_id,
        kind: row.kind,
        description: row.description,
        priority: row.priority,
        status: row.status,
        sourceRevisionId: row.source_revision_id,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      const items = requirementsBySpace.get(row.space_id) ?? [];
      items.push(requirement);
      requirementsBySpace.set(row.space_id, items);
    }

    return (spacesResult.data ?? []).map((row) => ({
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id,
      name: row.name,
      spaceType: row.space_type,
      areaM2: row.area_m2,
      priority: row.priority,
      status: row.status,
      notes: row.notes,
      position: row.position,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      requirements: requirementsBySpace.get(row.id) ?? [],
    }));
  },
);
