import { PageLoadingShell } from "@/components/app-shell/page-loading-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state para a listagem de obras.
 */
export default function ObrasLoading() {
  return (
    <PageLoadingShell>
      {/* Project cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </PageLoadingShell>
  );
}
