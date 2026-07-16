import Link from "next/link";
import { HardHat } from "lucide-react";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/app-shell/empty-state";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/queries/projects";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/supabase/types";

export const metadata = {
  title: "Obras — Prumo",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planejada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_CLASS: Record<ProjectStatus, string> = {
  planning: "bg-sky-100 text-sky-800",
  in_progress: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <PageContainer>
      <PageHeader
        title="Obras"
        description="Acompanhe execução, prazo, custos e cobranças em um só lugar."
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<HardHat />}
          title="Nenhuma obra ainda"
          description="Quando um orçamento for aprovado, transforme-o em obra para acompanhar etapas, diário, custos e cobrança."
          action={
            <Button asChild>
              <Link href="/app/orcamentos">Ver orçamentos</Link>
            </Button>
          }
        />
      ) : (
        <section aria-label="Lista de obras" className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {projects.length} {projects.length === 1 ? "obra" : "obras"}
          </p>
          <div className="overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_7.5rem_7.5rem_9rem] gap-4 border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
              <span>Obra</span>
              <span>Cliente</span>
              <span>Status</span>
              <span>Início</span>
              <span className="text-right">Orçamento</span>
            </div>
            <ul className="divide-y">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/app/obras/${project.id}`}
                    className="grid min-h-[92px] grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-16 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_7.5rem_7.5rem_9rem] md:items-center md:gap-4 md:py-3"
                  >
                    <span className="col-span-2 min-w-0 md:col-span-1">
                      <span
                        title={project.name}
                        className="block truncate text-sm font-semibold text-slate-950"
                      >
                        {project.name}
                      </span>
                    </span>
                    <span
                      title={project.customer?.name ?? "Sem cliente"}
                      className="min-w-0 truncate text-sm text-slate-600"
                    >
                      {project.customer?.name ?? "Sem cliente"}
                    </span>
                    <span className="justify-self-end md:col-start-3 md:row-start-1 md:justify-self-start">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_CLASS[project.status]}`}
                      >
                        {STATUS_LABEL[project.status]}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground md:col-start-4 md:row-start-1">
                      {project.starts_on ? formatDateBR(project.starts_on) : "Sem data"}
                    </span>
                    <span className="justify-self-end self-end text-base font-bold tabular-nums text-primary md:col-start-5 md:row-start-1 md:self-auto md:text-right">
                      {project.budget_cents == null
                        ? "Sem valor"
                        : formatBRL(project.budget_cents / 100)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </PageContainer>
  );
}
