import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-5 py-8 text-center sm:py-9",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5"
      >
        {icon}
      </div>
      <h2 className="mt-3 text-base font-semibold text-slate-950">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-md text-pretty text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
