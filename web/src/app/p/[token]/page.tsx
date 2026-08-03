import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { ThemeIconButton } from "@/components/theme-control";
import { getBusinessVocabulary } from "@/lib/business-segment";
import { getPublicProjectBriefingByToken } from "@/lib/queries/briefings";
import { getPublicDirectProjectIdentity } from "@/lib/queries/public-project-access";
import { PublicBriefingView } from "@/app/q/[token]/public-briefing-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = await getPublicDirectProjectIdentity(token);

  return {
    title: project
      ? `Briefing - ${project.projectName}`
      : "Briefing indisponível - Prumo",
    description: project
      ? `Briefing compartilhado por ${project.companyName}`
      : "Este acesso pode ter sido substituído ou removido.",
    robots: { index: false, follow: false },
    referrer: "no-referrer" as const,
  };
}

export default async function PublicDirectProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [project, briefing] = await Promise.all([
    getPublicDirectProjectIdentity(token),
    getPublicProjectBriefingByToken(token),
  ]);

  if (!project || !briefing) notFound();

  const vocabulary = getBusinessVocabulary(project.businessSegment);

  return (
    <main className="min-h-svh bg-background px-4 py-4 text-foreground sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex min-h-12 items-center justify-between gap-3 border-b pb-3">
          <div className="flex min-w-0 items-center gap-3">
            {project.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.companyLogoUrl}
                alt={project.companyName}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-md border object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                {project.companyName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {project.companyName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {vocabulary.projectSingular}: {project.projectName}
              </p>
            </div>
          </div>
          <ThemeIconButton className="h-10 w-10" />
        </header>

        <div className="mx-auto max-w-3xl py-4 sm:py-6">
          <div className="mb-4 flex items-start gap-3 px-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground">
                Informações para {project.projectName}
              </h1>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                Responda no seu ritmo. As alterações são salvas enquanto você
                avança.
              </p>
            </div>
          </div>

          <PublicBriefingView briefing={briefing} shareToken={token} />
        </div>
      </div>
    </main>
  );
}
