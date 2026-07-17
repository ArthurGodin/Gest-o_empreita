import type { ChargeStatus } from "@/lib/supabase/types";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_CONTEXT_AGE = 100_000_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type HealthState = "healthy" | "warning" | "critical";
export type IncidentSeverity = Exclude<HealthState, "healthy">;
export type OperationalCheckName =
  | "asaas_webhook"
  | "saas_checkout"
  | "asaas_availability"
  | "asaas_payment"
  | "saas_subscription"
  | "sinapi_release";

export type SafeContextValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[];
export type SafeContext = Record<string, SafeContextValue>;

export interface OperationalIssue {
  fingerprint: string;
  checkName: OperationalCheckName;
  severity: IncidentSeverity;
  summary: string;
  context: SafeContext;
}

export interface OperationalCheckResult {
  checkName: OperationalCheckName;
  state: HealthState;
  issues: OperationalIssue[];
  managedFingerprints: string[];
}

export interface WebhookHealthSignal {
  createdAt: string;
  eventType: string;
  processedAt: string | null;
  hasProcessingError: boolean;
}

export interface CheckoutHealthSignal {
  companyId: string;
  startedAt: string;
}

export type AsaasReadErrorCode =
  | "auth_invalid"
  | "timeout"
  | "network"
  | "server_error"
  | "invalid_response"
  | "unexpected";

export type AsaasHealthSignal =
  | { ok: true }
  | { ok: false; code: AsaasReadErrorCode };

export interface LocalPaymentSignal {
  id: string;
  status: ChargeStatus;
  paymentProvider: string;
  asaasPaymentId: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemotePaymentSignal {
  status: string;
}

export type AsaasLookup<T> =
  | { kind: "found"; value: T }
  | { kind: "not_found" }
  | { kind: "failure"; code: AsaasReadErrorCode };

export interface LocalSubscriptionSignal {
  companyId: string;
  plan: string;
  asaasSubscriptionId: string;
  pendingCheckoutStartedAt: string | null;
  updatedAt: string;
}

export interface RemoteSubscriptionSignal {
  status: string;
}

export interface SinapiReleaseSignal {
  competence: string;
  revision: number;
  rowCount: number;
}

export interface CandidateSelection<T> {
  selected: T[];
  total: number;
  excess: number;
}

export function evaluateWebhookHealth(
  events: WebhookHealthSignal[],
  now: Date,
): OperationalCheckResult {
  const processingErrors = events.filter((event) => event.hasProcessingError);
  const unprocessed = events.filter(
    (event) =>
      event.processedAt === null &&
      ageMilliseconds(event.createdAt, now) > 10 * MINUTE_MS,
  );
  const issues: OperationalIssue[] = [];

  if (processingErrors.length > 0) {
    issues.push({
      fingerprint: "asaas:webhook:processing-error",
      checkName: "asaas_webhook",
      severity: "critical",
      summary: "Webhook Asaas registrou falha de processamento.",
      context: {
        count: processingErrors.length,
        event_types: eventTypes(processingErrors),
      },
    });
  }

  if (unprocessed.length > 0) {
    issues.push({
      fingerprint: "asaas:webhook:unprocessed",
      checkName: "asaas_webhook",
      severity: "critical",
      summary: "Webhook Asaas permanece sem processamento ha mais de 10 minutos.",
      context: {
        count: unprocessed.length,
        oldest_age_minutes: oldestAge(unprocessed, now, "createdAt", MINUTE_MS),
        event_types: eventTypes(unprocessed),
      },
    });
  }

  return checkResult("asaas_webhook", issues, [
    "asaas:webhook:processing-error",
    "asaas:webhook:unprocessed",
  ]);
}

export function evaluateCheckoutHealth(
  checkouts: CheckoutHealthSignal[],
  now: Date,
): OperationalCheckResult {
  const stale = checkouts.filter(
    (checkout) => ageMilliseconds(checkout.startedAt, now) > HOUR_MS,
  );
  const fingerprint = "saas:checkout:stale";

  if (stale.length === 0) {
    return checkResult("saas_checkout", [], [fingerprint]);
  }

  const oldestAgeHours = oldestAge(stale, now, "startedAt", HOUR_MS);
  const severity: IncidentSeverity =
    stale.some(
      (checkout) => ageMilliseconds(checkout.startedAt, now) > 24 * HOUR_MS,
    )
      ? "critical"
      : "warning";

  return checkResult(
    "saas_checkout",
    [
      {
        fingerprint,
        checkName: "saas_checkout",
        severity,
        summary:
          severity === "critical"
            ? "Checkout SaaS permanece pendente ha mais de 24 horas."
            : "Checkout SaaS permanece pendente ha mais de uma hora.",
        context: {
          count: stale.length,
          oldest_age_hours: oldestAgeHours,
          age_bucket: severity === "critical" ? "over_24h" : "between_1h_24h",
        },
      },
    ],
    [fingerprint],
  );
}

export function evaluateAsaasAvailability(
  signal: AsaasHealthSignal,
): OperationalCheckResult {
  const managed = ["asaas:auth:invalid", "asaas:availability:unavailable"];
  if (signal.ok) return checkResult("asaas_availability", [], managed);

  const invalidAuth = signal.code === "auth_invalid";
  return checkResult(
    "asaas_availability",
    [
      {
        fingerprint: invalidAuth
          ? "asaas:auth:invalid"
          : "asaas:availability:unavailable",
        checkName: "asaas_availability",
        severity: invalidAuth ? "critical" : "warning",
        summary: invalidAuth
          ? "Credencial Asaas foi recusada."
          : "Asaas esta temporariamente indisponivel para conciliacao.",
        context: { error_code: signal.code },
      },
    ],
    managed,
  );
}

export function selectPaymentCandidates(
  payments: LocalPaymentSignal[],
  now: Date,
  limit = 20,
): CandidateSelection<LocalPaymentSignal> {
  const safeLimit = normalizeLimit(limit);
  const today = now.toISOString().slice(0, 10);
  const candidates = payments.filter((payment) => {
    if (
      payment.paymentProvider !== "asaas" ||
      !payment.asaasPaymentId?.trim()
    ) {
      return false;
    }

    if (payment.status === "draft") {
      return ageMilliseconds(payment.createdAt, now) > 15 * MINUTE_MS;
    }
    if (payment.status === "pending") {
      return Boolean(payment.dueDate && payment.dueDate <= today);
    }
    if (payment.status === "overdue") return true;
    if (isLocalPaymentPaid(payment.status)) {
      const paidReference = payment.paidAt ?? payment.updatedAt;
      return ageMilliseconds(paidReference, now) <= 7 * DAY_MS;
    }
    return false;
  });

  candidates.sort((left, right) => {
    const leftPaid = isLocalPaymentPaid(left.status);
    const rightPaid = isLocalPaymentPaid(right.status);
    if (leftPaid !== rightPaid) return leftPaid ? 1 : -1;

    const leftTime = timestampValue(
      leftPaid ? (left.paidAt ?? left.updatedAt) : left.createdAt,
    );
    const rightTime = timestampValue(
      rightPaid ? (right.paidAt ?? right.updatedAt) : right.createdAt,
    );
    if (leftTime !== rightTime) {
      return leftPaid ? rightTime - leftTime : leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  });

  return {
    selected: candidates.slice(0, safeLimit),
    total: candidates.length,
    excess: Math.max(0, candidates.length - safeLimit),
  };
}

export function evaluatePaymentReconciliation(
  local: LocalPaymentSignal,
  remote: AsaasLookup<RemotePaymentSignal>,
): OperationalCheckResult {
  const id = safeTechnicalId(local.id);
  const fingerprints = paymentFingerprints(id);

  if (remote.kind === "failure") {
    return checkResult(
      "asaas_payment",
      [
        {
          fingerprint: fingerprints.fetchFailed,
          checkName: "asaas_payment",
          severity: remote.code === "auth_invalid" ? "critical" : "warning",
          summary: "Cobranca nao pode ser consultada no Asaas.",
          context: { charge_id: id, error_code: remote.code },
        },
      ],
      [fingerprints.fetchFailed],
    );
  }

  if (remote.kind === "not_found") {
    return checkResult(
      "asaas_payment",
      [
        {
          fingerprint: fingerprints.remoteMissing,
          checkName: "asaas_payment",
          severity: "critical",
          summary: "Cobranca local nao foi encontrada no Asaas.",
          context: { charge_id: id },
        },
      ],
      Object.values(fingerprints),
    );
  }

  const remoteCategory = normalizeRemotePaymentStatus(remote.value.status);
  const context: SafeContext = {
    charge_id: id,
    local_status: local.status,
    remote_state: remoteCategory,
  };
  let issue: OperationalIssue | null = null;

  if (remoteCategory === "unknown") {
    issue = {
      fingerprint: fingerprints.unknownStatus,
      checkName: "asaas_payment",
      severity: "warning",
      summary: "Asaas retornou estado de cobranca ainda nao reconhecido.",
      context,
    };
  } else if (remoteCategory === "paid" && !isLocalPaymentPaid(local.status)) {
    issue = {
      fingerprint: fingerprints.remotePaidLocalPending,
      checkName: "asaas_payment",
      severity: "critical",
      summary: "Asaas reconhece pagamento que o Prumo ainda nao reconheceu.",
      context,
    };
  } else if (isLocalPaymentPaid(local.status) && remoteCategory !== "paid") {
    issue = {
      fingerprint: fingerprints.localPaidRemoteUnpaid,
      checkName: "asaas_payment",
      severity: "warning",
      summary: "Prumo registra pagamento em estado incompativel no Asaas.",
      context,
    };
  } else if (
    remoteCategory === "terminal" &&
    local.status !== "cancelled"
  ) {
    issue = {
      fingerprint: fingerprints.remoteTerminalLocalActive,
      checkName: "asaas_payment",
      severity: "warning",
      summary: "Cobranca esta encerrada no Asaas e ativa no Prumo.",
      context,
    };
  } else if (
    remoteCategory === "unpaid" &&
    local.status === "cancelled"
  ) {
    issue = {
      fingerprint: fingerprints.localCancelledRemoteActive,
      checkName: "asaas_payment",
      severity: "warning",
      summary: "Cobranca esta cancelada no Prumo e ativa no Asaas.",
      context,
    };
  }

  return checkResult(
    "asaas_payment",
    issue ? [issue] : [],
    Object.values(fingerprints),
  );
}

export function selectSubscriptionCandidates(
  subscriptions: LocalSubscriptionSignal[],
  limit = 20,
): CandidateSelection<LocalSubscriptionSignal> {
  const safeLimit = normalizeLimit(limit);
  const candidates = subscriptions.filter((subscription) =>
    Boolean(subscription.asaasSubscriptionId.trim()),
  );

  candidates.sort((left, right) => {
    const leftCheckout = timestampValue(left.pendingCheckoutStartedAt);
    const rightCheckout = timestampValue(right.pendingCheckoutStartedAt);
    const leftHasCheckout = leftCheckout > 0;
    const rightHasCheckout = rightCheckout > 0;
    if (leftHasCheckout !== rightHasCheckout) return leftHasCheckout ? -1 : 1;
    if (leftCheckout !== rightCheckout) return rightCheckout - leftCheckout;

    const updatedDifference =
      timestampValue(right.updatedAt) - timestampValue(left.updatedAt);
    if (updatedDifference !== 0) return updatedDifference;
    return left.companyId.localeCompare(right.companyId);
  });

  return {
    selected: candidates.slice(0, safeLimit),
    total: candidates.length,
    excess: Math.max(0, candidates.length - safeLimit),
  };
}

export function evaluateSubscriptionReconciliation(
  local: LocalSubscriptionSignal,
  remote: AsaasLookup<RemoteSubscriptionSignal>,
): OperationalCheckResult {
  const id = safeTechnicalId(local.companyId);
  const fingerprints = subscriptionFingerprints(id);

  if (remote.kind === "failure") {
    return checkResult(
      "saas_subscription",
      [
        {
          fingerprint: fingerprints.fetchFailed,
          checkName: "saas_subscription",
          severity: remote.code === "auth_invalid" ? "critical" : "warning",
          summary: "Assinatura nao pode ser consultada no Asaas.",
          context: { company_id: id, error_code: remote.code },
        },
      ],
      [fingerprints.fetchFailed],
    );
  }

  if (remote.kind === "not_found") {
    return checkResult(
      "saas_subscription",
      [
        {
          fingerprint: fingerprints.remoteMissing,
          checkName: "saas_subscription",
          severity: "critical",
          summary: "Assinatura local nao foi encontrada no Asaas.",
          context: { company_id: id },
        },
      ],
      Object.values(fingerprints),
    );
  }

  const localPlan = normalizeLocalPlan(local.plan);
  const remoteStatus = normalizeRemoteSubscriptionStatus(remote.value.status);
  const context: SafeContext = {
    company_id: id,
    local_plan: localPlan,
    remote_state: remoteStatus,
  };
  let issue: OperationalIssue | null = null;

  if (localPlan === "unknown") {
    issue = {
      fingerprint: fingerprints.unknownLocalPlan,
      checkName: "saas_subscription",
      severity: "warning",
      summary: "Empresa possui assinatura com plano local nao reconhecido.",
      context,
    };
  } else if (remoteStatus === "unknown") {
    issue = {
      fingerprint: fingerprints.unknownRemoteStatus,
      checkName: "saas_subscription",
      severity: "warning",
      summary: "Asaas retornou estado de assinatura ainda nao reconhecido.",
      context,
    };
  } else if (
    (localPlan === "pro" || localPlan === "ultimate") &&
    remoteStatus !== "active"
  ) {
    issue = {
      fingerprint: fingerprints.remoteInactiveLocalPaid,
      checkName: "saas_subscription",
      severity: "critical",
      summary: "Plano pago local possui assinatura inativa no Asaas.",
      context,
    };
  } else if (localPlan === "free" && remoteStatus === "active") {
    issue = {
      fingerprint: fingerprints.remoteActiveLocalFree,
      checkName: "saas_subscription",
      severity: "critical",
      summary: "Assinatura ativa no Asaas esta vinculada a plano Gratis local.",
      context,
    };
  }

  return checkResult(
    "saas_subscription",
    issue ? [issue] : [],
    Object.values(fingerprints),
  );
}

export function evaluateReconciliationCapacity(
  kind: "payment" | "subscription",
  total: number,
  limit: number,
): OperationalCheckResult {
  const checkName = kind === "payment" ? "asaas_payment" : "saas_subscription";
  const fingerprint =
    kind === "payment"
      ? "asaas:payment:reconciliation-truncated"
      : "saas:subscription:reconciliation-truncated";
  const safeTotal = Math.max(0, Math.trunc(total));
  const safeLimit = normalizeLimit(limit);

  if (safeTotal <= safeLimit) return checkResult(checkName, [], [fingerprint]);

  return checkResult(
    checkName,
    [
      {
        fingerprint,
        checkName,
        severity: "warning",
        summary:
          kind === "payment"
            ? "Conciliacao de cobrancas atingiu o limite diario."
            : "Conciliacao de assinaturas atingiu o limite diario.",
        context: {
          candidate_count: safeTotal,
          limit: safeLimit,
          excess_count: safeTotal - safeLimit,
        },
      },
    ],
    [fingerprint],
  );
}

export function evaluateSinapiHealth(
  release: SinapiReleaseSignal | null,
  now: Date,
): OperationalCheckResult {
  const managed = ["sinapi:missing", "sinapi:stale"];
  const competenceDate = release
    ? parseMonthlyCompetence(release.competence)
    : null;

  if (!release || !competenceDate) {
    return checkResult(
      "sinapi_release",
      [
        {
          fingerprint: "sinapi:missing",
          checkName: "sinapi_release",
          severity: "critical",
          summary: "Nenhuma competencia SINAPI publicada foi encontrada.",
          context: {},
        },
      ],
      managed,
    );
  }

  const ageDays = Math.max(
    0,
    Math.floor(
      (utcStartOfDay(now).getTime() - competenceDate.getTime()) / DAY_MS,
    ),
  );
  if (ageDays <= 60) return checkResult("sinapi_release", [], managed);

  const severity: IncidentSeverity = ageDays > 75 ? "critical" : "warning";
  return checkResult(
    "sinapi_release",
    [
      {
        fingerprint: "sinapi:stale",
        checkName: "sinapi_release",
        severity,
        summary:
          severity === "critical"
            ? "Competencia SINAPI esta vencida ha mais de 75 dias."
            : "Competencia SINAPI esta com mais de 60 dias.",
        context: {
          competence: release.competence.slice(0, 7),
          revision: release.revision,
          age_days: ageDays,
          row_count: release.rowCount,
        },
      },
    ],
    managed,
  );
}

export function summarizeCheckResults(results: OperationalCheckResult[]) {
  const counts = { healthy: 0, warning: 0, critical: 0 };
  const issues: OperationalIssue[] = [];
  const managedFingerprints = new Set<string>();

  for (const result of results) {
    counts[result.state] += 1;
    issues.push(...result.issues);
    for (const fingerprint of result.managedFingerprints) {
      managedFingerprints.add(fingerprint);
    }
  }

  return {
    state: counts.critical > 0 ? "critical" : counts.warning > 0 ? "warning" : "healthy",
    counts,
    issues,
    managedFingerprints: [...managedFingerprints].sort(),
  } as const;
}

export function normalizeRemotePaymentStatus(
  status: string,
): "paid" | "unpaid" | "terminal" | "unknown" {
  const normalized = normalizeProviderStatus(status);
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(normalized)) {
    return "paid";
  }
  if (["PENDING", "OVERDUE", "AWAITING_RISK_ANALYSIS"].includes(normalized)) {
    return "unpaid";
  }
  if (
    [
      "REFUNDED",
      "REFUND_REQUESTED",
      "REFUND_IN_PROGRESS",
      "CHARGEBACK_REQUESTED",
      "CHARGEBACK_DISPUTE",
      "AWAITING_CHARGEBACK_REVERSAL",
      "DELETED",
    ].includes(normalized)
  ) {
    return "terminal";
  }
  return "unknown";
}

function checkResult(
  checkName: OperationalCheckName,
  issues: OperationalIssue[],
  managedFingerprints: string[],
): OperationalCheckResult {
  const state = issues.some((issue) => issue.severity === "critical")
    ? "critical"
    : issues.length > 0
      ? "warning"
      : "healthy";
  return {
    checkName,
    state,
    issues,
    managedFingerprints: [...new Set(managedFingerprints)].sort(),
  };
}

function paymentFingerprints(id: string) {
  return {
    fetchFailed: `asaas:payment:fetch-failed:${id}`,
    remoteMissing: `asaas:payment:remote-missing:${id}`,
    unknownStatus: `asaas:payment:unknown-status:${id}`,
    remotePaidLocalPending: `asaas:payment:remote-paid-local-pending:${id}`,
    localPaidRemoteUnpaid: `asaas:payment:local-paid-remote-unpaid:${id}`,
    remoteTerminalLocalActive: `asaas:payment:remote-terminal-local-active:${id}`,
    localCancelledRemoteActive: `asaas:payment:local-cancelled-remote-active:${id}`,
  };
}

function subscriptionFingerprints(id: string) {
  return {
    fetchFailed: `saas:subscription:fetch-failed:${id}`,
    remoteMissing: `saas:subscription:remote-missing:${id}`,
    unknownLocalPlan: `saas:subscription:unknown-local-plan:${id}`,
    unknownRemoteStatus: `saas:subscription:unknown-remote-status:${id}`,
    remoteInactiveLocalPaid: `saas:subscription:remote-inactive-local-paid:${id}`,
    remoteActiveLocalFree: `saas:subscription:remote-active-local-free:${id}`,
  };
}

function normalizeRemoteSubscriptionStatus(
  status: string,
): "active" | "inactive" | "expired" | "unknown" {
  const normalized = normalizeProviderStatus(status);
  if (normalized === "ACTIVE") return "active";
  if (
    normalized === "INACTIVE" ||
    normalized === "CANCELED" ||
    normalized === "CANCELLED" ||
    normalized === "DELETED"
  ) {
    return "inactive";
  }
  if (normalized === "EXPIRED") return "expired";
  return "unknown";
}

function normalizeLocalPlan(plan: string): "free" | "pro" | "ultimate" | "unknown" {
  const normalized = plan.trim().toLowerCase();
  if (normalized === "free" || normalized === "gratis") return "free";
  if (normalized === "pro") return "pro";
  if (normalized === "ultimate") return "ultimate";
  return "unknown";
}

function isLocalPaymentPaid(status: ChargeStatus) {
  return status === "received" || status === "confirmed";
}

function normalizeProviderStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{0,39}$/.test(normalized) ? normalized : "UNKNOWN";
}

function safeTechnicalId(value: string) {
  const normalized = value.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : "invalid-id";
}

function eventTypes(events: WebhookHealthSignal[]) {
  return [
    ...new Set(
      events.map((event) => {
        const normalized = event.eventType.trim().toUpperCase();
        return /^[A-Z][A-Z0-9_]{0,59}$/.test(normalized)
          ? normalized
          : "UNKNOWN";
      }),
    ),
  ]
    .sort()
    .slice(0, 5);
}

function oldestAge<T extends Record<K, string>, K extends keyof T>(
  items: T[],
  now: Date,
  key: K,
  unit: number,
) {
  const oldest = Math.max(
    ...items.map((item) => ageMilliseconds(item[key], now)),
  );
  return Math.min(MAX_CONTEXT_AGE, Math.floor(oldest / unit));
}

function ageMilliseconds(value: string, now: Date) {
  const timestamp = timestampValue(value);
  if (timestamp === 0) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, now.getTime() - timestamp);
}

function timestampValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return 20;
  return limit;
}

function parseMonthlyCompetence(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function utcStartOfDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}
