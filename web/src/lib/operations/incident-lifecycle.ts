import type {
  IncidentSeverity,
  OperationalCheckName,
  OperationalIssue,
  SafeContext,
} from "./monitor-core";

const NOTIFICATION_INTERVAL_MS = 24 * 60 * 60 * 1_000;

export interface StoredOperationalIncident {
  fingerprint: string;
  checkName: OperationalCheckName;
  severity: IncidentSeverity;
  status: "open" | "resolved";
  summary: string;
  context: SafeContext;
  firstSeenAt: string;
  lastSeenAt: string;
  lastNotifiedAt: string | null;
  resolvedAt: string | null;
  occurrenceCount: number;
}

export interface OpenIncidentMutation {
  kind: "upsert_open";
  reason: "new" | "recurring" | "reopened";
  record: StoredOperationalIncident;
}

export interface ResolveIncidentMutation {
  kind: "resolve";
  fingerprint: string;
  resolvedAt: string;
}

export type IncidentMutation =
  | OpenIncidentMutation
  | ResolveIncidentMutation;

export interface RecoveryNotification {
  fingerprint: string;
  checkName: OperationalCheckName;
  previousSummary: string;
  context: SafeContext;
}

export interface IncidentLifecyclePlan {
  mutations: IncidentMutation[];
  notifications: {
    critical: OperationalIssue[];
    warning: OperationalIssue[];
    resolved: RecoveryNotification[];
  };
}

export function planIncidentLifecycle(input: {
  now: Date;
  issues: OperationalIssue[];
  managedFingerprints: string[];
  existing: StoredOperationalIncident[];
}): IncidentLifecyclePlan {
  const nowIso = input.now.toISOString();
  const existingByFingerprint = uniqueMap(
    input.existing,
    (incident) => incident.fingerprint,
    "existing incident",
  );
  const issueByFingerprint = uniqueMap(
    input.issues,
    (issue) => issue.fingerprint,
    "operational issue",
  );
  const managed = new Set(input.managedFingerprints);
  const mutations: IncidentMutation[] = [];
  const critical: OperationalIssue[] = [];
  const warning: OperationalIssue[] = [];
  const resolved: RecoveryNotification[] = [];

  for (const issue of [...issueByFingerprint.values()].sort(byFingerprint)) {
    const current = existingByFingerprint.get(issue.fingerprint);
    if (current && current.checkName !== issue.checkName) {
      throw new Error("Incident fingerprint changed operational check.");
    }
    const reason = !current
      ? "new"
      : current.status === "resolved"
        ? "reopened"
        : "recurring";
    const record: StoredOperationalIncident = {
      fingerprint: issue.fingerprint,
      checkName: issue.checkName,
      severity: issue.severity,
      status: "open",
      summary: issue.summary,
      context: issue.context,
      firstSeenAt: current?.firstSeenAt ?? nowIso,
      lastSeenAt: nowIso,
      lastNotifiedAt: current?.lastNotifiedAt ?? null,
      resolvedAt: null,
      occurrenceCount: (current?.occurrenceCount ?? 0) + 1,
    };

    mutations.push({ kind: "upsert_open", reason, record });

    if (shouldNotifyOpenIssue(current, issue, input.now, reason)) {
      if (issue.severity === "critical") critical.push(issue);
      else warning.push(issue);
    }
  }

  for (const current of [...existingByFingerprint.values()].sort(byFingerprint)) {
    if (
      current.status !== "open" ||
      !managed.has(current.fingerprint) ||
      issueByFingerprint.has(current.fingerprint)
    ) {
      continue;
    }

    mutations.push({
      kind: "resolve",
      fingerprint: current.fingerprint,
      resolvedAt: nowIso,
    });

    if (current.severity === "critical" && current.lastNotifiedAt) {
      resolved.push({
        fingerprint: current.fingerprint,
        checkName: current.checkName,
        previousSummary: current.summary,
        context: current.context,
      });
    }
  }

  return {
    mutations,
    notifications: { critical, warning, resolved },
  };
}

export function buildDailyDigestKey(
  kind: "critical" | "warning" | "resolved" | "test",
  now: Date,
) {
  return `operational:${kind}:${now.toISOString().slice(0, 10)}`;
}

function shouldNotifyOpenIssue(
  current: StoredOperationalIncident | undefined,
  issue: OperationalIssue,
  now: Date,
  reason: OpenIncidentMutation["reason"],
) {
  if (!current || reason === "reopened") return true;
  if (current.severity === "warning" && issue.severity === "critical") {
    return true;
  }
  if (!current.lastNotifiedAt) return true;

  const notifiedAt = Date.parse(current.lastNotifiedAt);
  if (!Number.isFinite(notifiedAt)) return true;
  return now.getTime() - notifiedAt >= NOTIFICATION_INTERVAL_MS;
}

function uniqueMap<T>(
  values: T[],
  keyOf: (value: T) => string,
  label: string,
) {
  const map = new Map<string, T>();
  for (const value of values) {
    const key = keyOf(value);
    if (map.has(key)) throw new Error(`Duplicate ${label} fingerprint.`);
    map.set(key, value);
  }
  return map;
}

function byFingerprint(
  left: { fingerprint: string },
  right: { fingerprint: string },
) {
  return left.fingerprint.localeCompare(right.fingerprint);
}
