import Link from "next/link";
import { HardHat } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/queries/projects";
import { formatBRL, formatDateBR } from "@/lib/utils";

export const metadata = {
  title: "Obras — Prumo",
};

const STATUS_LABEL = {
  planning: "Planejada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
} as const;

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container space-y-6 py-6">
      <PageHeader
        title="Obras"
        description="Suas obras em andamento. Um orçamento aprovado pode virar obra com 1 clique."
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<HardHat className="h-6 w-6" />}
          title="Nenhuma obra ainda"
          description="As obras aparecem aqui quando os clientes aprovam orçamentos. Crie um orçamento, mande pelo WhatsApp e quando o cliente aprovar, vira obra com 1 clique."
          action={
            <Button asChild>
              <Link href="/app/orcamentos/novo">Criar orçamento</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/app/obras/${project.id}`}
                className="block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {STATUS_LABEL[project.status]}
                </div>
                <h3 className="mt-1 font-semibold leading-tight">
                  {project.name}
                </h3>
                {project.customer && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {project.customer.name}
                  </div>
                )}
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-xs text-muted-foreground">
                    {project.starts_on
                      ? `Início: ${formatDateBR(project.starts_on)}`
                      : "Sem data"}
                  </span>
                  {project.budget_cents != null && (
                    <span className="font-semibold text-primary">
                      {formatBRL(project.budget_cents / 100)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
