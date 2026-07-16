import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type PageContainerSize = "narrow" | "medium" | "default";
export type PageContainerSpacing = "compact" | "default" | "relaxed";

const sizeClasses: Record<PageContainerSize, string> = {
  narrow: "max-w-3xl",
  medium: "max-w-4xl",
  default: "max-w-[1184px]",
};

const spacingClasses: Record<PageContainerSpacing, string> = {
  compact: "space-y-4 py-4 sm:py-5",
  default: "space-y-5 py-4 sm:py-6",
  relaxed: "space-y-6 py-4 sm:py-6",
};

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: PageContainerSize;
  spacing?: PageContainerSpacing;
}

export function PageContainer({
  size = "default",
  spacing = "default",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeClasses[size],
        spacingClasses[spacing],
        className,
      )}
      {...props}
    />
  );
}
