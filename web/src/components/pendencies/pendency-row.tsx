import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CircleDollarSign,
  FileCheck2,
  FileClock,
  type LucideIcon,
} from "lucide-react";
import { PendencyLink } from "@/components/pendencies/pendency-tracking";
import type {
  OperationalPendency,
  OperationalPendencyPriority,
  OperationalPendencyType,
} from "@/lib/operational-pendencies-core";
import { cn, formatBRL, formatDateBR } from "@/lib/utils";

const TYPE_ICON: Record<OperationalPendencyType, LucideIcon> = {
  billing_overdue: CircleDollarSign,
  project_overdue: CalendarClock,
  project_balance_missing: BadgeDollarSign,
  quote_approved_without_project: FileCheck2,
  quote_expired: FileClock,
};

const PRIORITY_COPY: Record<
  OperationalPendencyPriority,
  { label: string; badge: string; icon: string }
> = {
  critical: {
    label: "Urgente",
    badge: "border-red-200 bg-red-50 text-red-800",
    icon: "bg-red-100 text-red-700",
  },
  high: {
    label: "Atenção",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "bg-amber-100 text-amber-800",
  },
  normal: {
    label: "Pendente",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    icon: "bg-primary/10 text-primary",
  },
};

export function PendencyRow({
  pendency,
  compact = false,
}: {
  pendency: OperationalPendency;
  compact?: boolean;
}) {
  const Icon = TYPE_ICON[pendency.type];
  const priority = PRIORITY_COPY[pendency.priority];

  return (
    <PendencyLink
      href={pendency.href}
      pendencyType={pendency.type}
      category={pendency.category}
      priority={pendency.priority}
      className={cn(
        "group grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        !compact && "sm:grid-cols-[2.25rem_minmax(0,1fr)_1rem] sm:py-3.5",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md",
          priority.icon,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-sm font-semibold leading-5">
            {pendency.title}
          </span>
          <span
            className={cn(
              "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase",
              priority.badge,
            )}
          >
            {priority.label}
          </span>
        </span>
        <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">
          {pendency.detail}
          {pendency.customerName ? ` · ${pendency.customerName}` : ""}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
          <span>{dateCopy(pendency)}</span>
          {pendency.amountCents !== null ? (
            <span className="font-semibold tabular-nums text-foreground">
              {formatBRL(pendency.amountCents / 100)}
            </span>
          ) : null}
        </span>
      </span>

      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </PendencyLink>
  );
}

function dateCopy(pendency: OperationalPendency) {
  if (!pendency.displayDate) return "Requer revisão";
  const date = formatDateBR(pendency.displayDate);

  switch (pendency.type) {
    case "billing_overdue":
      return `Venceu em ${date}`;
    case "project_overdue":
      return `Prazo em ${date}`;
    case "project_balance_missing":
      return `Entrega aprovada em ${date}`;
    case "quote_approved_without_project":
      return `Aprovado em ${date}`;
    case "quote_expired":
      return `Validade até ${date}`;
  }
}
