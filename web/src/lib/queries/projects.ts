import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/supabase/types";

export interface Project {
  id: string;
  company_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  address: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
  budget_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem extends Project {
  customer: { id: string; name: string } | null;
}

export const getProjects = cache(async (): Promise<ProjectListItem[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, customer:customers(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProjectListItem[];
});

export const getProject = cache(
  async (id: string): Promise<ProjectListItem | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*, customer:customers(id, name)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as ProjectListItem | null) ?? null;
  },
);
