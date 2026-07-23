import type { EffectiveQuoteStatus } from "@/lib/quote-status";
import type {
  ChargeKind,
  ChargeStatus,
  ProjectDeliverableReviewAction,
  ProjectStatus,
} from "@/lib/supabase/types";

export const PENDENCY_CATEGORIES = ["quotes", "projects", "billing"] as const;

export type OperationalPendencyCategory =
  (typeof PENDENCY_CATEGORIES)[number];
export type OperationalPendencyPriority =
  | "critical"
  | "high"
  | "normal"
  | "low";
export type OperationalPendencyType =
  | "billing_overdue"
  | "project_overdue"
  | "project_balance_missing"
  | "quote_approved_without_project"
  | "quote_expired"
  | "deliverable_changes_requested"
  | "deliverable_review_stale"
  | "deliverable_upload_stale";

interface PendencyQuoteInput {
  id: string;
  number: string;
  title: string;
  project_id: string | null;
  effective_status: EffectiveQuoteStatus;
  valid_until: string | null;
  approved_at: string | null;
  updated_at: string;
  customer: { name: string } | null;
}

interface PendencyProjectInput {
  id: string;
  name: string;
  status: ProjectStatus;
  ends_on: string | null;
  delivery_approved_at: string | null;
  updated_at: string;
  customer: { name: string } | null;
}

interface PendencyChargeInput {
  id: string;
  project_id: string;
  kind: ChargeKind;
  status: ChargeStatus;
  due_date: string | null;
  amount_cents: number;
  updated_at: string;
}

export interface DeliverablePendencyInput {
  id: string;
  project_id: string;
  title: string;
  current_published_at: string | null;
  current_review_action: ProjectDeliverableReviewAction | null;
  current_reviewed_at: string | null;
  pending_upload_created_at: string | null;
}

export interface OperationalPendencyInput {
  today: string;
  quotes: readonly PendencyQuoteInput[];
  projects: readonly PendencyProjectInput[];
  charges: readonly PendencyChargeInput[];
  deliverables: readonly DeliverablePendencyInput[];
}

export interface OperationalPendency {
  id: string;
  type: OperationalPendencyType;
  category: OperationalPendencyCategory;
  priority: OperationalPendencyPriority;
  title: string;
  detail: string;
  href: string;
  referenceDate: string;
  entityName: string;
  customerName: string | null;
  displayDate: string | null;
  amountCents: number | null;
  chargeKind: ChargeKind | null;
}

const OPEN_PROJECT_STATUSES = new Set<ProjectStatus>([
  "planning",
  "in_progress",
  "paused",
]);
const PRIORITY_ORDER: Record<OperationalPendencyPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function buildOperationalPendencies(
  input: OperationalPendencyInput,
): OperationalPendency[] {
  const pendencies: OperationalPendency[] = [];
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const projectsWithBalanceCharge = new Set(
    input.charges
      .filter((charge) => charge.kind === "saldo")
      .map((charge) => charge.project_id),
  );

  for (const charge of input.charges) {
    const overdue =
      charge.status === "overdue" ||
      (charge.status === "pending" &&
        isDateBefore(charge.due_date, input.today));
    if (!overdue) continue;

    const project = projectById.get(charge.project_id);
    const entityName = project?.name ?? "Obra";
    pendencies.push({
      id: `billing-overdue-${charge.id}`,
      type: "billing_overdue",
      category: "billing",
      priority: "critical",
      title: "Cobrança vencida",
      detail: `${charge.kind === "entrada" ? "Entrada" : "Saldo"} de ${entityName}`,
      href: `/app/obras/${charge.project_id}`,
      referenceDate: dateOnly(charge.due_date) ?? input.today,
      entityName,
      customerName: project?.customer?.name ?? null,
      displayDate: dateOnly(charge.due_date),
      amountCents: charge.amount_cents,
      chargeKind: charge.kind,
    });
  }

  for (const project of input.projects) {
    if (
      OPEN_PROJECT_STATUSES.has(project.status) &&
      isDateBefore(project.ends_on, input.today)
    ) {
      pendencies.push({
        id: `project-overdue-${project.id}`,
        type: "project_overdue",
        category: "projects",
        priority: "high",
        title: "Obra fora do prazo",
        detail: project.name,
        href: `/app/obras/${project.id}`,
        referenceDate: dateOnly(project.ends_on) ?? input.today,
        entityName: project.name,
        customerName: project.customer?.name ?? null,
        displayDate: dateOnly(project.ends_on),
        amountCents: null,
        chargeKind: null,
      });
    }

    if (
      project.status !== "cancelled" &&
      project.delivery_approved_at &&
      !projectsWithBalanceCharge.has(project.id)
    ) {
      pendencies.push({
        id: `project-balance-${project.id}`,
        type: "project_balance_missing",
        category: "billing",
        priority: "high",
        title: "Gerar cobrança do saldo",
        detail: project.name,
        href: `/app/obras/${project.id}`,
        referenceDate:
          dateOnly(project.delivery_approved_at) ??
          dateOnly(project.updated_at) ??
          input.today,
        entityName: project.name,
        customerName: project.customer?.name ?? null,
        displayDate: dateOnly(project.delivery_approved_at),
        amountCents: null,
        chargeKind: "saldo",
      });
    }
  }

  for (const quote of input.quotes) {
    if (quote.effective_status === "approved" && !quote.project_id) {
      pendencies.push({
        id: `quote-approved-${quote.id}`,
        type: "quote_approved_without_project",
        category: "quotes",
        priority: "normal",
        title: "Transformar aprovado em obra",
        detail: `${quote.number} · ${quote.title}`,
        href: `/app/orcamentos/${quote.id}`,
        referenceDate:
          dateOnly(quote.approved_at) ??
          dateOnly(quote.updated_at) ??
          input.today,
        entityName: quote.title,
        customerName: quote.customer?.name ?? null,
        displayDate: dateOnly(quote.approved_at),
        amountCents: null,
        chargeKind: null,
      });
    }

    if (quote.effective_status === "expired") {
      pendencies.push({
        id: `quote-expired-${quote.id}`,
        type: "quote_expired",
        category: "quotes",
        priority: "normal",
        title: "Revisar proposta expirada",
        detail: `${quote.number} · ${quote.title}`,
        href: `/app/orcamentos/${quote.id}`,
        referenceDate:
          dateOnly(quote.valid_until) ??
          dateOnly(quote.updated_at) ??
          input.today,
        entityName: quote.title,
        customerName: quote.customer?.name ?? null,
        displayDate: dateOnly(quote.valid_until),
        amountCents: null,
        chargeKind: null,
      });
    }
  }

  const staleReviewThreshold = daysBefore(input.today, 3);
  const staleUploadThreshold = daysBefore(input.today, 1);

  for (const deliverable of input.deliverables) {
    const project = projectById.get(deliverable.project_id);
    const entityName = project?.name ?? "Projeto ou obra";
    const customerName = project?.customer?.name ?? null;

    if (deliverable.current_review_action === "changes_requested") {
      const reviewedOn =
        dateOnly(deliverable.current_reviewed_at) ??
        dateOnly(deliverable.current_published_at) ??
        input.today;
      pendencies.push({
        id: `deliverable-changes-${deliverable.id}`,
        type: "deliverable_changes_requested",
        category: "projects",
        priority: "high",
        title: "Ajustes solicitados",
        detail: `${deliverable.title} \u00b7 ${entityName}`,
        href: `/app/obras/${deliverable.project_id}#entregas`,
        referenceDate: reviewedOn,
        entityName,
        customerName,
        displayDate: reviewedOn,
        amountCents: null,
        chargeKind: null,
      });
    } else if (
      deliverable.current_published_at &&
      !deliverable.current_review_action &&
      isDateBefore(deliverable.current_published_at, staleReviewThreshold)
    ) {
      const publishedOn =
        dateOnly(deliverable.current_published_at) ?? input.today;
      pendencies.push({
        id: `deliverable-review-${deliverable.id}`,
        type: "deliverable_review_stale",
        category: "projects",
        priority: "normal",
        title: "Cliente ainda n\u00e3o revisou",
        detail: `${deliverable.title} \u00b7 ${entityName}`,
        href: `/app/obras/${deliverable.project_id}#entregas`,
        referenceDate: publishedOn,
        entityName,
        customerName,
        displayDate: publishedOn,
        amountCents: null,
        chargeKind: null,
      });
    }

    if (
      deliverable.pending_upload_created_at &&
      isDateBefore(
        deliverable.pending_upload_created_at,
        staleUploadThreshold,
      )
    ) {
      const createdOn =
        dateOnly(deliverable.pending_upload_created_at) ?? input.today;
      pendencies.push({
        id: `deliverable-upload-${deliverable.id}`,
        type: "deliverable_upload_stale",
        category: "projects",
        priority: "low",
        title: "Upload de entrega interrompido",
        detail: `${deliverable.title} \u00b7 ${entityName}`,
        href: `/app/obras/${deliverable.project_id}#entregas`,
        referenceDate: createdOn,
        entityName,
        customerName,
        displayDate: createdOn,
        amountCents: null,
        chargeKind: null,
      });
    }
  }

  return pendencies.sort(comparePendencies);
}

export function isOperationalPendencyCategory(
  value: unknown,
): value is OperationalPendencyCategory {
  return PENDENCY_CATEGORIES.includes(value as OperationalPendencyCategory);
}

function comparePendencies(
  left: OperationalPendency,
  right: OperationalPendency,
) {
  return (
    PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority] ||
    left.referenceDate.localeCompare(right.referenceDate) ||
    left.id.localeCompare(right.id)
  );
}

function isDateBefore(value: string | null, today: string) {
  const parsed = dateOnly(value);
  return parsed !== null && parsed < today;
}

function dateOnly(value: string | null) {
  if (!value) return null;
  const parsed = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : null;
}

function daysBefore(today: string, days: number) {
  const date = new Date(`${today}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return today;
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
