import { PageLoadingShell } from "@/components/app-shell/page-loading-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state para a tela financeira.
 */
export default function FinanceiroLoading() {
  return (
    <PageLoadingShell showAction={false}>
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      </div>
    </PageLoadingShell>
  );
}
