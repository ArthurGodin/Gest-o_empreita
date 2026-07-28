import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutGrid,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app-shell/page-container";
import { PageHeader } from "@/components/app-shell/page-header";
import { getActiveCompany } from "@/lib/queries/company";
import { getDemoWorkspaceSnapshot } from "@/lib/queries/demo-workspace";
import {
  buildDemoWorkspaceSteps,
  demoWorkspaceTitle,
  type DemoWorkspaceStepId,
} from "@/lib/demo-workspace";
import { env } from "@/lib/env";
import {
  isDemoWorkspace,
  normalizeWorkspaceMode,
} from "@/lib/workspace-mode";
import {
  normalizeBusinessSegment,
  getBusinessVocabulary,
} from "@/lib/business-segment";
import { DemoCenterTracker, DemoStepAction } from "./demo-center-client";
import { DemoScenarioButton } from "./demo-scenario-button";

export const metadata = {
  title: "Demonstração - Prumo",
};

const STEP_ICONS: Record<DemoWorkspaceStepId, typeof FileText> = {
  quote: FileText,
  public_view: ShieldCheck,
  pdf: ReceiptText,
  project: FolderKanban,
  briefing: ClipboardList,
  spaces: LayoutGrid,
  deliverables: PackageCheck,
  finance: WalletCards,
};

export default async function DemoWorkspacePage() {
  const company = await getActiveCompany();
  if (!company) redirect("/onboarding");

  const workspaceMode = normalizeWorkspaceMode(
    company.company.workspace_mode,
  );
  if (!isDemoWorkspace(workspaceMode)) redirect("/app");

  const segment = normalizeBusinessSegment(company.company.business_segment);
  const vocabulary = getBusinessVocabulary(segment);
  const snapshot = await getDemoWorkspaceSnapshot(company.company_id);
  const steps = buildDemoWorkspaceSteps(
    segment,
    snapshot,
    env.NEXT_PUBLIC_APP_URL,
  );

  return (
    <PageContainer size="medium" spacing="compact">
      <DemoCenterTracker />
      <PageHeader
        title="Demonstração"
        description={`Cenário fictício de ${demoWorkspaceTitle(segment).toLowerCase()}, usando as telas reais do Prumo.`}
        actions={
          <span className="inline-flex h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Ultimate demo
          </span>
        }
      />

      <section className="border-b pb-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Cenário atual
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {snapshot?.projectName ?? "Ainda não preparado"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {snapshot
                ? `${snapshot.quoteTitle}. Pagamentos externos permanecem bloqueados.`
                : `Prepare dados fictícios de cliente, ${vocabulary.quoteSingular.toLowerCase()} e ${vocabulary.projectSingular.toLowerCase()}.`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {snapshot ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/app/orcamentos/${snapshot.quoteId}`}>
                  Abrir {vocabulary.quoteSingular.toLowerCase()}
                </Link>
              </Button>
            ) : null}
            <DemoScenarioButton hasScenario={Boolean(snapshot)} />
          </div>
        </div>
      </section>

      <section aria-labelledby="demo-route-title">
        <div className="mb-3">
          <h2 id="demo-route-title" className="text-base font-semibold">
            Roteiro
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Abra cada etapa conforme a conversa avançar.
          </p>
        </div>

        <ol className="divide-y overflow-hidden rounded-lg border bg-card">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.id];
            return (
              <li
                key={step.id}
                className="grid min-w-0 gap-3 px-3 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center sm:px-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase text-muted-foreground">
                    Etapa {index + 1}
                  </span>
                  <span className="block text-sm font-semibold text-foreground">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
                    {step.detail}
                  </span>
                </span>
                <div className="pl-11 sm:pl-0">
                  <DemoStepAction step={step} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex items-start gap-3 border-t pt-4">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
        />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Dinheiro real protegido
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Checkout, Asaas e geração de Pix são recusados pelo servidor neste
            ambiente.
          </p>
        </div>
      </section>
    </PageContainer>
  );
}
