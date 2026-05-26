import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { createClient } from "@/lib/supabase/server";
import type {
  StageTemplate,
  StageTemplateItem,
} from "@/lib/queries/stage-templates";
import { TemplateList } from "./template-list";

export const metadata = {
  title: "Templates de obra — Configurações",
};

interface TemplateWithItems {
  template: StageTemplate;
  items: StageTemplateItem[];
}

async function loadTemplates(): Promise<TemplateWithItems[]> {
  const supabase = createClient();
  const { data: tpls, error } = await supabase
    .from("stage_templates")
    .select("*, items:stage_template_items(*)")
    .order("is_system", { ascending: false })
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return ((tpls ?? []) as unknown as Array<
    StageTemplate & { items: StageTemplateItem[] }
  >).map(({ items, ...template }) => ({
    template,
    items: items.slice().sort((a, b) => a.position - b.position),
  }));
}

export default async function TemplatesPage() {
  const templates = await loadTemplates();

  return (
    <div className="container max-w-3xl space-y-6 py-6">
      <Link
        href="/app/configuracoes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para configurações
      </Link>

      <PageHeader
        title="Templates de obra"
        description="Modelos de etapas pra acelerar a abertura de novas obras."
      />

      <TemplateList templates={templates} />
    </div>
  );
}
