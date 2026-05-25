import { createClient } from "@/lib/supabase/server";
import type { DiaryEntry } from "@/lib/queries/projects";

export interface ListDiaryOptions {
  limit?: number;
  before?: string;
}

/**
 * Lista entradas do diário ordenadas por created_at desc, com fotos.
 * Paginação via `before` (cursor por created_at).
 */
export async function listDiary(
  projectId: string,
  opts: ListDiaryOptions = {},
): Promise<DiaryEntry[]> {
  const supabase = createClient();
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);

  let query = supabase
    .from("diary_entries")
    .select("*, photos:diary_photos(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.before) {
    query = query.lt("created_at", opts.before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as DiaryEntry[];
}
