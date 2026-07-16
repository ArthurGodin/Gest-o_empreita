import { PageLoadingShell } from "@/components/app-shell/page-loading-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state para a listagem de orçamentos.
 */
export default function OrcamentosLoading() {
  return (
    <PageLoadingShell>
      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Quote list */}
      <div className="divide-y rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </PageLoadingShell>
  );
}
