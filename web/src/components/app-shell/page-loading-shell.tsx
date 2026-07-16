import type { ReactNode } from "react";
import { PageContainer, type PageContainerSize } from "@/components/app-shell/page-container";
import { Skeleton } from "@/components/ui/skeleton";

interface PageLoadingShellProps {
  children: ReactNode;
  showAction?: boolean;
  size?: PageContainerSize;
}

export function PageLoadingShell({
  children,
  showAction = true,
  size = "default",
}: PageLoadingShellProps) {
  return (
    <PageContainer size={size} spacing="relaxed" aria-busy="true">
      <div className="flex min-w-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-40 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {showAction && (
          <Skeleton className="h-11 w-40 max-w-full rounded-md" />
        )}
      </div>
      {children}
    </PageContainer>
  );
}
