import Link from "next/link";
import { FolderKanban, HardHat } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/queries/projects";
import { getActiveCompany } from "@/lib/queries/company";
import { getBusinessVocabulary } from "@/lib/business-segment";
import { ProjectList } from "./project-list";

export const metadata = {
  title: "Projetos e obras - Prumo",
};

export default async function ProjectsPage() {
  const [projects, company] = await Promise.all([
    getProjects(),
    getActiveCompany(),
  ]);
  const vocabulary = getBusinessVocabulary(
    company?.company.business_segment,
  );
  const professional = vocabulary.projectSingular === "Projeto";
  const ProjectIcon = professional ? FolderKanban : HardHat;

  return (
    <PageContainer>
      <PageHeader
        title={vocabulary.projectPlural}
        description={`Acompanhe etapas, prazo, custos e cobranças em ${vocabulary.projectPluralLower}.`}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<ProjectIcon />}
          title={
            professional ? "Nenhum projeto criado" : "Nenhuma obra criada"
          }
          description={
            professional
              ? "Um projeto nasce de uma proposta aprovada. Acompanhe o aceite e faça a conversão quando ela estiver pronta."
              : "Uma obra nasce de um orçamento aprovado. Acompanhe o aceite e faça a conversão quando estiver pronto."
          }
          action={
            <Button asChild>
              <Link href="/app/orcamentos">
                {`Abrir ${vocabulary.quotePluralLower}`}
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
