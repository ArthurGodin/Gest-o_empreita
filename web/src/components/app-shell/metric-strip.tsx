import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricTone = "neutral" | "blue" | "amber" | "green" | "red";

interface MetricStripProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

export function MetricStrip({
  ariaLabel,
  children,
  className,
}: MetricStripProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.035)] xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

interface MetricTileProps {
  className?: string;
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: MetricTone;
}

const toneClasses: Record<MetricTone, string> = {
  neutral:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  green:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export function MetricTile({
  className,
  icon,
  label,
  value,
  hint,
  tone,
}: MetricTileProps) {
  return (
    <div className={cn("min-w-0 p-3.5 sm:p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <div className="mt-1 break-words text-lg font-bold tabular-nums text-slate-950 sm:text-xl">
            {value}
          </div>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">{hint}</p>
        </div>
        <span
          aria-hidden="true"
          className={cn("shrink-0 rounded-md p-2", toneClasses[tone])}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}
