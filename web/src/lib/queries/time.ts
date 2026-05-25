import { createClient } from "@/lib/supabase/server";
import type { TimeEntry } from "@/lib/queries/projects";

function todayBR(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export async function listTimeToday(projectId: string): Promise<TimeEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("project_id", projectId)
    .eq("worked_on", todayBR())
    .order("started_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TimeEntry[];
}

export interface ListTimeHistoryOptions {
  limit?: number;
  before?: string;
}

export async function listTimeHistory(
  projectId: string,
  opts: ListTimeHistoryOptions = {},
): Promise<TimeEntry[]> {
  const supabase = createClient();
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 200);

  let q = supabase
    .from("time_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("worked_on", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(limit);

  if (opts.before) q = q.lt("worked_on", opts.before);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TimeEntry[];
}

/**
 * Autocomplete de nomes de peões já usados pela empresa.
 * Distinct via JS (Supabase JS não tem .distinct() — usamos Set).
 */
export async function getWorkerNamesAutocomplete(
  companyId: string,
  query: string,
  limit = 10,
): Promise<string[]> {
  const supabase = createClient();
  const cleaned = query.trim();
  if (cleaned.length === 0) return [];

  const { data, error } = await supabase
    .from("time_entries")
    .select("worker_name")
    .eq("company_id", companyId)
    .ilike("worker_name", `%${cleaned}%`)
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (error) throw error;

  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of data ?? []) {
    const name = (row as { worker_name: string }).worker_name;
    if (!seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
      if (out.length >= limit) break;
    }
  }
  return out;
}
