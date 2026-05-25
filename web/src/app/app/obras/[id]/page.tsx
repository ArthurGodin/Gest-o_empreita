import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HardHat } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { getProject } from "@/lib/queries/projects";
import { formatBRL, formatDateBR } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProject(params.id);
  return {
    title: project
      ? `${project.name} — Obras`
      : "Obra não encontrada",
  };
}

const STATUS_LABEL = {
  planning: "Planejada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
} as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();

  return (
    <div className="container max-w-3xl space-y-6 py-6">
      <div>
        <Link
          href="/app/obras"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para obras
        </Link>
      </div>

      <PageHeader
        title={project.name}
        description={
          project.customer
            ? `Cliente: ${project.customer.name}`
            : "Sem cliente vinculado"
        }
      />

      <section className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </div>
            <div className="mt-1 font-semibold">
              {STATUS_LABEL[project.status]}
            </div>
          </div>
          {project.starts_on && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Início
              </div>
              <div className="mt-1 font-semibold">
                {formatDateBR(project.starts_on)}
              </div>
            </div>
          )}
          {project.budget_cents != null && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Valor previsto
              </div>
              <div className="mt-1 text-xl font-bold text-primary">
                {formatBRL(project.budget_cents / 100)}
              </div>
            </div>
          )}
          {project.address && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Endereço
              </div>
              <div className="mt-1">{project.address}</div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
        <HardHat className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">
          Painel completo da obra vem na Fase 1.3
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Etapas da obra, diário com fotos, custo real vs previsto, ponto de
          equipe — tudo isso vai ser construído na próxima fase. Por enquanto,
          a obra existe registrada com os dados do orçamento aprovado.
        </p>
      </section>
    </div>
  );
}
