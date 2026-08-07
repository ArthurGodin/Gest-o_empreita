import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed, Clock3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "attention" | "neutral";

const toneClasses: Record<Tone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  attention:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  neutral: "border-border bg-muted/60 text-muted-foreground",
};

export function DemoStatus({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "attention"
        ? Clock3
        : CircleDashed;

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export function DemoViewHeader({
  eyebrow,
  title,
  description,
  status,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold leading-7 text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {status ? <div className="shrink-0">{status}</div> : null}
    </header>
  );
}

export interface DemoMetric {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "positive";
}

export function DemoMetricGrid({ metrics }: { metrics: readonly DemoMetric[] }) {
  return (
    <dl className="grid overflow-hidden rounded-lg border bg-muted/20 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="min-w-0 border-b p-3 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0"
        >
          <dt className="text-xs font-medium text-muted-foreground">
            {metric.label}
          </dt>
          <dd
            className={cn(
              "mt-1 truncate text-lg font-bold tabular-nums text-foreground",
              metric.tone === "positive" && "text-emerald-700 dark:text-emerald-300",
            )}
          >
            {metric.value}
          </dd>
          {metric.detail ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {metric.detail}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function DemoProgress({
  value,
  label = "Progresso",
}: {
  value: number;
  label?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={`${label}: ${value}%`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function DemoProtectedNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t pt-4 text-sm text-muted-foreground">
      <ShieldCheck
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300"
      />
      <p className="leading-5">{children}</p>
    </div>
  );
}
