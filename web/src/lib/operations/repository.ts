import "server-only";

import {
  createAdminClient,
  type AdminClient,
} from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/types";
import type {
  IncidentMutation,
  StoredOperationalIncident,
} from "./incident-lifecycle";
import type {
  CheckoutHealthSignal,
  HealthState,
  LocalPaymentSignal,
  LocalSubscriptionSignal,
  OperationalCheckName,
  SafeContext,
  SinapiReleaseSignal,
  WebhookHealthSignal,
} from "./monitor-core";

const MAX_LOCAL_SIGNALS = 500;
const MAX_PAYMENT_ROWS_PER_STATE = 100;
const MAX_SUBSCRIPTION_ROWS_PER_GROUP = 20;
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const INCIDENT_SELECT =
  "fingerprint, check_name, severity, status, summary, safe_context, first_seen_at, last_seen_at, last_notified_at, resolved_at, occurrence_count";
const PAYMENT_SELECT =
  "id, status, payment_provider, asaas_payment_id, due_date, paid_at, created_at, updated_at";
const SUBSCRIPTION_SELECT =
  "id, plan, saas_asaas_subscription_id, saas_pending_checkout_started_at, updated_at";

type OperationalIncidentRow = Pick<
  Tables<"operational_incidents">,
  | "fingerprint"
  | "check_name"
  | "severity"
  | "status"
  | "summary"
  | "safe_context"
  | "first_seen_at"
  | "last_seen_at"
  | "last_notified_at"
  | "resolved_at"
  | "occurrence_count"
>;

type PaymentRow = Pick<
  Tables<"billing_charges">,
  | "id"
  | "status"
  | "payment_provider"
  | "asaas_payment_id"
  | "due_date"
  | "paid_at"
  | "created_at"
  | "updated_at"
>;

type SubscriptionRow = Pick<
  Tables<"companies">,
  | "id"
  | "plan"
  | "saas_asaas_subscription_id"
  | "saas_pending_checkout_started_at"
  | "updated_at"
>;

export interface OperationalLocalSnapshot {
  webhooks: WebhookHealthSignal[];
  checkouts: CheckoutHealthSignal[];
  paymentCandidates: LocalPaymentSignal[];
  paymentCandidateCount: number;
  trackedPayments: LocalPaymentSignal[];
  subscriptionCandidates: LocalSubscriptionSignal[];
  subscriptionCandidateCount: number;
  trackedSubscriptions: LocalSubscriptionSignal[];
  sinapiRelease: SinapiReleaseSignal | null;
  openIncidents: StoredOperationalIncident[];
}

export interface OperationalRunCompletion {
  status: HealthState | "failed";
  finishedAt: string;
  checkCounts: { healthy: number; warning: number; critical: number };
  incidentCount: number;
  alertCount: number;
  errorCode: string | null;
}

export interface OperationalRepository {
  startRun(input: {
    runKey: string;
    trigger: "cron" | "manual";
    startedAt: string;
  }): Promise<{ kind: "started"; id: string } | { kind: "duplicate" }>;
  finishRun(runId: string, completion: OperationalRunCompletion): Promise<void>;
  loadLocalSnapshot(now: Date): Promise<OperationalLocalSnapshot>;
  getIncidents(fingerprints: string[]): Promise<StoredOperationalIncident[]>;
  applyIncidentMutations(mutations: IncidentMutation[]): Promise<void>;
  markIncidentsNotified(fingerprints: string[], notifiedAt: string): Promise<void>;
}

export class OperationalRepositoryError extends Error {
  code: string;

  constructor(code: string, options?: { cause?: unknown }) {
    super(code, options);
    this.name = "OperationalRepositoryError";
    this.code = code;
  }
}

export function createOperationalRepository(
  admin: AdminClient = createAdminClient(),
): OperationalRepository {
  return {
    async startRun(input) {
      const { data, error } = await admin
        .from("operational_monitor_runs")
        .insert({
          run_key: input.runKey,
          trigger: input.trigger,
          started_at: input.startedAt,
        })
        .select("id")
        .single();

      if (error?.code === "23505") return { kind: "duplicate" };
      if (error || !data) fail("run_start_failed", error);
      return { kind: "started", id: data.id };
    },

    async finishRun(runId, completion) {
      const { data, error } = await admin
        .from("operational_monitor_runs")
        .update({
          status: completion.status,
          finished_at: completion.finishedAt,
          check_counts: completion.checkCounts,
          incident_count: completion.incidentCount,
          alert_count: completion.alertCount,
          error_code: completion.errorCode,
        })
        .eq("id", runId)
        .eq("status", "running")
        .select("id")
        .maybeSingle();

      if (error || !data) fail("run_finish_failed", error);
    },

    async loadLocalSnapshot(now) {
      const openIncidents = await loadOpenIncidents(admin);
      const tracked = trackedIdsFromIncidents(openIncidents);
      return loadSnapshotRows(admin, now, openIncidents, tracked);
    },

    async getIncidents(fingerprints) {
      const unique = [...new Set(fingerprints)].sort();
      if (unique.length === 0) return [];

      const rows: OperationalIncidentRow[] = [];
      for (const chunk of chunks(unique, 100)) {
        const { data, error } = await admin
          .from("operational_incidents")
          .select(INCIDENT_SELECT)
          .in("fingerprint", chunk);
        if (error) fail("incident_read_failed", error);
        rows.push(...((data ?? []) as OperationalIncidentRow[]));
      }
      return rows.map(mapIncidentRow);
    },

    async applyIncidentMutations(mutations) {
      const openMutations = mutations.filter(
        (mutation) => mutation.kind === "upsert_open",
      );
      if (openMutations.length > 0) {
        const { error } = await admin.from("operational_incidents").upsert(
          openMutations.map(({ record }) => ({
            fingerprint: record.fingerprint,
            check_name: record.checkName,
            severity: record.severity,
            status: "open",
            summary: record.summary,
            safe_context: record.context as Json,
            first_seen_at: record.firstSeenAt,
            last_seen_at: record.lastSeenAt,
            last_notified_at: record.lastNotifiedAt,
            resolved_at: null,
            occurrence_count: record.occurrenceCount,
          })),
          { onConflict: "fingerprint" },
        );
        if (error) fail("incident_upsert_failed", error);
      }

      const resolutionGroups = new Map<string, string[]>();
      for (const mutation of mutations) {
        if (mutation.kind !== "resolve") continue;
        const group = resolutionGroups.get(mutation.resolvedAt) ?? [];
        group.push(mutation.fingerprint);
        resolutionGroups.set(mutation.resolvedAt, group);
      }

      for (const [resolvedAt, fingerprints] of resolutionGroups) {
        const { error } = await admin
          .from("operational_incidents")
          .update({ status: "resolved", resolved_at: resolvedAt })
          .in("fingerprint", fingerprints)
          .eq("status", "open");
        if (error) fail("incident_resolve_failed", error);
      }
    },

    async markIncidentsNotified(fingerprints, notifiedAt) {
      const unique = [...new Set(fingerprints)];
      if (unique.length === 0) return;
      const { error } = await admin
        .from("operational_incidents")
        .update({ last_notified_at: notifiedAt })
        .in("fingerprint", unique);
      if (error) fail("incident_notification_mark_failed", error);
    },
  };
}

async function loadOpenIncidents(admin: AdminClient) {
  const { data, error } = await admin
    .from("operational_incidents")
    .select(INCIDENT_SELECT)
    .eq("status", "open")
    .order("last_seen_at", { ascending: false })
    .limit(MAX_LOCAL_SIGNALS + 1);
  if (error) fail("open_incident_read_failed", error);
  if ((data?.length ?? 0) > MAX_LOCAL_SIGNALS) {
    fail("open_incident_limit_exceeded");
  }
  return ((data ?? []) as OperationalIncidentRow[]).map(mapIncidentRow);
}

async function loadSnapshotRows(
  admin: AdminClient,
  now: Date,
  openIncidents: StoredOperationalIncident[],
  tracked: { paymentIds: string[]; companyIds: string[] },
): Promise<OperationalLocalSnapshot> {
  const unprocessedCutoff = new Date(now.getTime() - 10 * 60_000).toISOString();
  const checkoutCutoff = new Date(now.getTime() - 60 * 60_000).toISOString();
  const draftCutoff = new Date(now.getTime() - 15 * 60_000).toISOString();
  const paidCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();
  const today = now.toISOString().slice(0, 10);

  const [
    webhookErrors,
    webhookUnprocessed,
    staleCheckouts,
    draftPayments,
    pendingPayments,
    overduePayments,
    paidPayments,
    trackedPayments,
    pendingSubscriptions,
    regularSubscriptions,
    trackedSubscriptions,
    sinapiRelease,
  ] = await Promise.all([
    admin
      .from("billing_webhook_events")
      .select("id, event_type, created_at, processed_at")
      .not("processing_error", "is", null)
      .order("created_at", { ascending: true })
      .limit(MAX_LOCAL_SIGNALS + 1),
    admin
      .from("billing_webhook_events")
      .select("id, event_type, created_at, processed_at")
      .is("processed_at", null)
      .lt("created_at", unprocessedCutoff)
      .order("created_at", { ascending: true })
      .limit(MAX_LOCAL_SIGNALS + 1),
    admin
      .from("companies")
      .select("id, saas_pending_checkout_started_at")
      .not("saas_pending_checkout_started_at", "is", null)
      .lt("saas_pending_checkout_started_at", checkoutCutoff)
      .order("saas_pending_checkout_started_at", { ascending: true })
      .limit(MAX_LOCAL_SIGNALS + 1),
    paymentQuery(admin, "draft")
      .lt("created_at", draftCutoff)
      .order("created_at", { ascending: true })
      .limit(MAX_PAYMENT_ROWS_PER_STATE),
    paymentQuery(admin, "pending")
      .lte("due_date", today)
      .order("created_at", { ascending: true })
      .limit(MAX_PAYMENT_ROWS_PER_STATE),
    paymentQuery(admin, "overdue")
      .order("created_at", { ascending: true })
      .limit(MAX_PAYMENT_ROWS_PER_STATE),
    admin
      .from("billing_charges")
      .select(PAYMENT_SELECT, { count: "exact" })
      .eq("payment_provider", "asaas")
      .not("asaas_payment_id", "is", null)
      .in("status", ["received", "confirmed"])
      .gte("updated_at", paidCutoff)
      .order("updated_at", { ascending: false })
      .limit(MAX_PAYMENT_ROWS_PER_STATE),
    admin
      .from("billing_charges")
      .select(PAYMENT_SELECT)
      .eq("payment_provider", "asaas")
      .not("asaas_payment_id", "is", null)
      .in("id", tracked.paymentIds.length ? tracked.paymentIds : [EMPTY_UUID]),
    subscriptionQuery(admin)
      .not("saas_pending_checkout_started_at", "is", null)
      .order("saas_pending_checkout_started_at", { ascending: false })
      .limit(MAX_SUBSCRIPTION_ROWS_PER_GROUP),
    subscriptionQuery(admin)
      .is("saas_pending_checkout_started_at", null)
      .order("updated_at", { ascending: false })
      .limit(MAX_SUBSCRIPTION_ROWS_PER_GROUP),
    admin
      .from("companies")
      .select(SUBSCRIPTION_SELECT)
      .in("id", tracked.companyIds.length ? tracked.companyIds : [EMPTY_UUID]),
    admin
      .from("sinapi_releases")
      .select("competence, revision, row_count")
      .eq("status", "published")
      .order("competence", { ascending: false })
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const allResults = [
    webhookErrors,
    webhookUnprocessed,
    staleCheckouts,
    draftPayments,
    pendingPayments,
    overduePayments,
    paidPayments,
    trackedPayments,
    pendingSubscriptions,
    regularSubscriptions,
    trackedSubscriptions,
    sinapiRelease,
  ];
  const failedResult = allResults.find((result) => result.error);
  if (failedResult?.error) fail("local_snapshot_query_failed", failedResult.error);

  if (
    (webhookErrors.data?.length ?? 0) > MAX_LOCAL_SIGNALS ||
    (webhookUnprocessed.data?.length ?? 0) > MAX_LOCAL_SIGNALS ||
    (staleCheckouts.data?.length ?? 0) > MAX_LOCAL_SIGNALS
  ) {
    fail("local_snapshot_limit_exceeded");
  }

  const errorEventIds = new Set(
    (webhookErrors.data ?? []).map((row) => row.id),
  );
  const webhookRows = uniqueById([
    ...(webhookErrors.data ?? []),
    ...(webhookUnprocessed.data ?? []),
  ]);
  const paymentRows = uniqueById([
    ...(draftPayments.data ?? []),
    ...(pendingPayments.data ?? []),
    ...(overduePayments.data ?? []),
    ...(paidPayments.data ?? []),
  ] as PaymentRow[]);
  const trackedPaymentRows = uniqueById(
    (trackedPayments.data ?? []) as PaymentRow[],
  );
  const subscriptionRows = uniqueById([
    ...(pendingSubscriptions.data ?? []),
    ...(regularSubscriptions.data ?? []),
  ] as SubscriptionRow[]);

  return {
    webhooks: webhookRows.map((row) => ({
      createdAt: row.created_at,
      eventType: row.event_type,
      processedAt: row.processed_at,
      hasProcessingError: errorEventIds.has(row.id),
    })),
    checkouts: (staleCheckouts.data ?? []).flatMap((row) =>
      row.saas_pending_checkout_started_at
        ? [
            {
              companyId: row.id,
              startedAt: row.saas_pending_checkout_started_at,
            },
          ]
        : [],
    ),
    paymentCandidates: paymentRows.map(mapPaymentRow),
    paymentCandidateCount:
      (draftPayments.count ?? 0) +
      (pendingPayments.count ?? 0) +
      (overduePayments.count ?? 0) +
      (paidPayments.count ?? 0),
    trackedPayments: trackedPaymentRows.map(mapPaymentRow),
    subscriptionCandidates: subscriptionRows.flatMap(mapSubscriptionRow),
    subscriptionCandidateCount:
      (pendingSubscriptions.count ?? 0) + (regularSubscriptions.count ?? 0),
    trackedSubscriptions: ((trackedSubscriptions.data ?? []) as SubscriptionRow[])
      .flatMap(mapSubscriptionRow),
    sinapiRelease: sinapiRelease.data
      ? {
          competence: sinapiRelease.data.competence,
          revision: sinapiRelease.data.revision,
          rowCount: sinapiRelease.data.row_count,
        }
      : null,
    openIncidents,
  };
}

function paymentQuery(admin: AdminClient, status: "draft" | "pending" | "overdue") {
  return admin
    .from("billing_charges")
    .select(PAYMENT_SELECT, { count: "exact" })
    .eq("payment_provider", "asaas")
    .not("asaas_payment_id", "is", null)
    .eq("status", status);
}

function subscriptionQuery(admin: AdminClient) {
  return admin
    .from("companies")
    .select(SUBSCRIPTION_SELECT, { count: "exact" })
    .not("saas_asaas_subscription_id", "is", null)
    .not("saas_asaas_subscription_id", "like", "PAYMENT_LINK:%");
}

function mapPaymentRow(row: PaymentRow): LocalPaymentSignal {
  return {
    id: row.id,
    status: row.status,
    paymentProvider: row.payment_provider,
    asaasPaymentId: row.asaas_payment_id,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubscriptionRow(row: SubscriptionRow): LocalSubscriptionSignal[] {
  const subscriptionId = row.saas_asaas_subscription_id?.trim();
  if (!subscriptionId || subscriptionId.startsWith("PAYMENT_LINK:")) return [];
  return [
    {
      companyId: row.id,
      plan: row.plan,
      asaasSubscriptionId: subscriptionId,
      pendingCheckoutStartedAt: row.saas_pending_checkout_started_at,
      updatedAt: row.updated_at,
    },
  ];
}

function mapIncidentRow(row: OperationalIncidentRow): StoredOperationalIncident {
  if (
    !isOperationalCheckName(row.check_name) ||
    (row.severity !== "warning" && row.severity !== "critical") ||
    (row.status !== "open" && row.status !== "resolved")
  ) {
    fail("incident_row_invalid");
  }

  return {
    fingerprint: row.fingerprint,
    checkName: row.check_name,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    context: safeContextFromJson(row.safe_context),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastNotifiedAt: row.last_notified_at,
    resolvedAt: row.resolved_at,
    occurrenceCount: row.occurrence_count,
  };
}

function trackedIdsFromIncidents(incidents: StoredOperationalIncident[]) {
  const paymentIds = new Set<string>();
  const companyIds = new Set<string>();
  for (const incident of incidents) {
    const id = technicalIdAtEnd(incident.fingerprint);
    if (!id) continue;
    if (incident.fingerprint.startsWith("asaas:payment:")) paymentIds.add(id);
    if (incident.fingerprint.startsWith("saas:subscription:")) companyIds.add(id);
  }
  return {
    paymentIds: [...paymentIds].sort(),
    companyIds: [...companyIds].sort(),
  };
}

function technicalIdAtEnd(fingerprint: string) {
  return fingerprint.match(
    /:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/,
  )?.[1] ?? null;
}

function safeContextFromJson(value: Json): SafeContext {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  const context: SafeContext = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      context[key] = typeof item === "string" ? item.slice(0, 120) : item;
      continue;
    }
    if (
      Array.isArray(item) &&
      item.length <= 10 &&
      item.every((entry) => typeof entry === "string")
    ) {
      context[key] = item.map((entry) => entry.slice(0, 80));
    }
  }
  return context;
}

function isOperationalCheckName(value: string): value is OperationalCheckName {
  return [
    "asaas_webhook",
    "saas_checkout",
    "asaas_availability",
    "asaas_payment",
    "saas_subscription",
    "sinapi_release",
  ].includes(value);
}

function uniqueById<T extends { id: string }>(rows: T[]) {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function fail(code: string, cause?: unknown): never {
  throw new OperationalRepositoryError(code, { cause });
}
