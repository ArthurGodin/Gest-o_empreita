import Link from "next/link";
import { HardHat } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/queries/projects";
import { ProjectList } from "./project-list";

export const metadata = {
  title: "Obras - Prumo",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <PageContainer>
      <PageHeader
        title="Obras"
        description={
          "Acompanhe execu\u00e7\u00e3o, prazo, custos e cobran\u00e7as em um s\u00f3 lugar."
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<HardHat />}
          title="Nenhuma obra criada"
          description={
            "Uma obra nasce de um or\u00e7amento aprovado. Abra suas propostas para acompanhar um aceite ou fazer a convers\u00e3o."
          }
          action={
            <Button asChild>
              <Link href="/app/orcamentos">
                {"Abrir or\u00e7amentos"}
              </Link>
            </Button>
          }
        />
      ) : (
        <ProjectList projects={projects} />
      )}
    </PageContainer>
  );
}
