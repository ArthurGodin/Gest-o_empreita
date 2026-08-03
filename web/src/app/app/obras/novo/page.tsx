import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  isActivationGoalAllowed,
  normalizeActivationGoal,
  type ActivationGoal,
} from "@/lib/activation-goals";
import { getBusinessVocabulary } from "@/lib/business-segment";
import { getActiveCompany } from "@/lib/queries/company";
import { getCustomers } from "@/lib/queries/customers";
import { listTemplates } from "@/lib/queries/stage-templates";
import { DirectProjectForm } from "./direct-project-form";

export const metadata = {
  title: "Novo projeto ou obra - Prumo",
};

export default async function NewDirectProjectPage({
  searchParams,
}: {
  searchParams?: Promise<{ goal?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const [customers, templates, membership] = await Promise.all([
    getCustomers(),
    listTemplates(),
    getActiveCompany(),
  ]);

  if (!membership) return null;

  const segment = membership.company.business_segment;
  const savedGoal = normalizeActivationGoal(
    membership.company.activation_goal,
    segment,
  );
  const requestedGoal = isActivationGoalAllowed(query.goal, segment)
    ? query.goal
    : savedGoal;
  const goal: ActivationGoal =
    requestedGoal === "sell" ? "existing_project" : requestedGoal;
  const vocabulary = getBusinessVocabulary(segment);

  return (
    <PageContainer size="medium" spacing="compact">
      <div>
        <Link
          href="/app/obras"
          className="-ml-2 inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Voltar para {vocabulary.projectPluralLower}
        </Link>
      </div>

      <PageHeader
        title={
          vocabulary.projectSingular === "Projeto"
            ? "Cadastrar projeto contratado"
            : "Cadastrar obra contratada"
        }
        description="Use este caminho quando o trabalho já foi fechado fora do Prumo. Nenhuma cobrança será criada."
      />

      <DirectProjectForm
        customers={customers}
        templates={templates}
        goal={goal}
        segment={segment}
      />
    </PageContainer>
  );
}
