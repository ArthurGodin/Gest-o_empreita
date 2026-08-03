import Link from "next/link";
import { FolderKanban, HardHat, Plus } from "lucide-react";
import { EmptyState } from "@/components/app-shell/empty-state";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/queries/projects";
import { getActiveCompany } from "@/lib/queries/company";
import { getBusinessVocabulary } from "@/lib/business-segment";
import { normalizeActivationGoal } from "@/lib/activation-goals";
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
  const activationGoal = normalizeActivationGoal(
    company?.company.activation_goal,
    company?.company.business_segment,
  );
  const directProjectHref = `/app/obras/novo?goal=${
    activationGoal === "sell" ? "existing_project" : activationGoal
  }`;

  return (
    <PageContainer>
      <PageHeader
        title={vocabulary.projectPlural}
        description={`Acompanhe etapas, prazo, custos e cobranças em ${vocabulary.projectPluralLower}.`}
        actions={
          <Button asChild>
            <Link href={directProjectHref}>
              <Plus aria-hidden="true" />
              {professional ? "Cadastrar projeto" : "Cadastrar obra"}
            </Link>
          </Button>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<ProjectIcon />}
          title={
            professional ? "Nenhum projeto criado" : "Nenhuma obra criada"
          }
          description={
            professional
              ? "Cadastre um projeto já contratado ou converta uma proposta aprovada. Nenhuma cobrança é criada automaticamente."
              : "Cadastre uma obra já contratada ou converta um orçamento aprovado. Nenhuma cobrança é criada automaticamente."
          }
          action={
            <Button asChild>
              <Link href={directProjectHref}>
                <Plus aria-hidden="true" />
                {professional ? "Cadastrar projeto" : "Cadastrar obra"}
              </Link>
            </Button>
          }
          secondaryAction={
            <Button asChild variant="outline">
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
