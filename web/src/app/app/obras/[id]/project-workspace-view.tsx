import { cn } from "@/lib/utils";

interface ProjectWorkspaceViewProps {
  children: React.ReactNode;
  className?: string;
  label: string;
}

export function ProjectWorkspaceView({
  children,
  className,
  label,
}: ProjectWorkspaceViewProps) {
  return (
    <section
      id="project-workspace-view"
      tabIndex={-1}
      aria-label={label}
      className={cn(
        "min-w-0 space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </section>
  );
}
