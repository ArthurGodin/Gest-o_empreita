import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface StageTemplate {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  position: number;
}

export interface StageTemplateItem {
  id: string;
  template_id: string;
  position: number;
  name: string;
  est_days: number | null;
}

export interface StageTemplateWithItems extends StageTemplate {
  items: StageTemplateItem[];
}

/**
 * Lista templates visíveis ao usuário: system (company_id null) + custom
 * da empresa. Ordenados por is_system desc, position asc.
 */
export const listTemplates = cache(async (): Promise<StageTemplate[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stage_templates")
    .select("id,company_id,name,description,is_system,position")
    .order("is_system", { ascending: false })
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StageTemplate[];
});

export const getTemplate = cache(
  async (id: string): Promise<StageTemplateWithItems | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stage_templates")
      .select("*, items:stage_template_items(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const raw = data as unknown as StageTemplate & {
      items?: StageTemplateItem[];
    };
    const items = (raw.items ?? []).slice().sort(
      (a, b) => a.position - b.position,
    );
    return { ...raw, items };
  },
);
