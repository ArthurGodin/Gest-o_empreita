import "server-only";

import {
  sendOperationalAlert,
  type OperationalAlertInput,
} from "@/lib/alerts";
import { logServerError, logServerEvent, logServerWarning } from "@/lib/log";
import { buildDailyDigestKey, planIncidentLifecycle } from "./incident-lifecycle";
import { buildOperationalDigest } from "./monitor-alerts-core";
import { createAsaasReadClient, type AsaasReadClient } from "./asaas-reconciliation";
import {
  createOperationalRepository,
  OperationalRepositoryError,
  type OperationalRepository,
} from "./repository";
import {
  collectOperationalAssessment,
  type OperationalAssessment,
} from "./snapshot";

const DEFAULT_TIMEOUT_MS = 45_000;
const FAILURE_ALERT_TIMEOUT_MS = 5_000;

export type OperationalAlertSender = (
  input: OperationalAlertInput,
) => Promise<{ sent: boolean; error?: string }>;

export interface OperationalMonitorDependencies {
  repository: OperationalRepository;
  asaas: AsaasReadClient;
  alertSender: OperationalAlertSender;
  collectAssessment: typeof collectOperationalAssessment;
  now: () => Date;
  timeoutMs: number;
}

export interface OperationalMonitorResult {
  status: "healthy" | "warning" | "critical" | "skipped";
  alertCount: number;
  incidentCount: number;
}

export class OperationalMonitorError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = "OperationalMonitorError";
    this.code = code;
  }
}

export async function runOperationalMonitor(
  input: { runKey: string; trigger: "cron" | "manual" },
  overrides: Partial<OperationalMonitorDependencies> = {},
): Promise<OperationalMonitorResult> {
  const dependencies = resolveDependencies(overrides);
  const deadline = new OperationDeadline(dependencies.timeoutMs);
  const startedAt = dependencies.now();
  const startedAtMs = Date.now();
  let runId: string | null = null;
  let alertCount = 0;
  let incidentCount = 0;
  let counts = { healthy: 0, warning: 0, critical: 0 };

  try {
    const startResult = await deadline.run(() =>
      dependencies.repository.startRun({
        runKey: input.runKey,
        trigger: input.trigger,
        startedAt: startedAt.toISOString(),
      }),
    );
    if (startResult.kind === "duplicate") {
      logServerWarning("ops.monitor.duplicate", { trigger: input.trigger });
      return { status: "skipped", alertCount: 0, incidentCount: 0 };
    }
    runId = startResult.id;

    const assessment = await deadline.run(() =>
      dependencies.collectAssessment({
        repository: dependencies.repository,
        asaas: dependencies.asaas,
        now: startedAt,
      }),
    );
    counts = assessment.counts;
    incidentCount = assessment.issues.length;

    const relevantFingerprints = [
      ...new Set([
        ...assessment.managedFingerprints,
        ...assessment.issues.map((issue) => issue.fingerprint),
      ]),
    ];
    const existing = await deadline.run(() =>
      dependencies.repository.getIncidents(relevantFingerprints),
    );
    const lifecycle = planIncidentLifecycle({
      now: startedAt,
      issues: assessment.issues,
      managedFingerprints: assessment.managedFingerprints,
      existing,
    });

    await deadline.run(() =>
      dependencies.repository.applyIncidentMutations(lifecycle.mutations),
    );
    const alerts = await sendLifecycleDigests({
      lifecycle,
      assessment,
      now: startedAt,
      sender: dependencies.alertSender,
      repository: dependencies.repository,
      deadline,
    });
    alertCount = alerts.sentCount;

    await deadline.run(() =>
      dependencies.repository.finishRun(runId as string, {
        status: assessment.state,
        finishedAt: dependencies.now().toISOString(),
        checkCounts: assessment.counts,
        incidentCount,
        alertCount,
        errorCode: alerts.hadFailure ? "alert_send_failed" : null,
      }),
    );

    logServerEvent("ops.monitor.completed", {
      trigger: input.trigger,
      status: assessment.state,
      incident_count: incidentCount,
      alert_count: alertCount,
      payment_candidates: assessment.metrics.paymentCandidates,
      payments_checked: assessment.metrics.paymentsChecked,
      subscription_candidates: assessment.metrics.subscriptionCandidates,
      subscriptions_checked: assessment.metrics.subscriptionsChecked,
      ms: Date.now() - startedAtMs,
    });
    return {
      status: assessment.state,
      alertCount,
      incidentCount,
    };
  } catch (error) {
    const code = monitorErrorCode(error);
    const failureAlertSent = await sendFailureAlertBestEffort({
      sender: dependencies.alertSender,
      code,
      trigger: input.trigger,
      now: startedAt,
    });
    if (failureAlertSent) alertCount += 1;

    if (runId) {
      try {
        await withTimeout(
          dependencies.repository.finishRun(runId, {
            status: "failed",
            finishedAt: dependencies.now().toISOString(),
            checkCounts: counts,
            incidentCount,
            alertCount: Math.min(3, alertCount),
            errorCode: code,
          }),
          FAILURE_ALERT_TIMEOUT_MS,
        );
      } catch {
        logServerWarning("ops.monitor.failed_run_not_persisted", {
          trigger: input.trigger,
          error_code: code,
        });
      }
    }

    logServerError(
      "ops.monitor.failed",
      { name: "OperationalMonitorError", code, message: code },
      {
        trigger: input.trigger,
        error_code: code,
        ms: Date.now() - startedAtMs,
      },
    );
    throw new OperationalMonitorError(code);
  }
}

async function sendLifecycleDigests(input: {
  lifecycle: ReturnType<typeof planIncidentLifecycle>;
  assessment: OperationalAssessment;
  now: Date;
  sender: OperationalAlertSender;
  repository: OperationalRepository;
  deadline: OperationDeadline;
}) {
  const groups = [
    {
      kind: "critical" as const,
      items: input.lifecycle.notifications.critical,
    },
    {
      kind: "warning" as const,
      items: input.lifecycle.notifications.warning,
    },
    {
      kind: "resolved" as const,
      items: input.lifecycle.notifications.resolved,
    },
  ];
  let sentCount = 0;
  let hadFailure = false;

  for (const group of groups) {
    if (group.items.length === 0) continue;
    const result = await input.deadline.run(() =>
      safeSend(
        input.sender,
        buildOperationalDigest({
          kind: group.kind,
          items: group.items,
          dedupeKey: buildDailyDigestKey(group.kind, input.now),
          metrics: input.assessment.metrics,
        }),
      ),
    );
    if (!result.sent) {
      hadFailure = true;
      continue;
    }

    const fingerprints = group.items.map((item) => item.fingerprint);
    await input.deadline.run(() =>
      input.repository.markIncidentsNotified(
        fingerprints,
        input.now.toISOString(),
      ),
    );
    sentCount += 1;
  }

  return { sentCount, hadFailure };
}

async function sendFailureAlertBestEffort(input: {
  sender: OperationalAlertSender;
  code: string;
  trigger: "cron" | "manual";
  now: Date;
}) {
  try {
    const result = await withTimeout(
      safeSend(input.sender, {
        area: "monitoramento_operacional",
        severity: "critical",
        title: "Monitor operacional nao concluiu",
        message:
          "A varredura operacional falhou antes de concluir. Verifique o codigo interno e os logs sanitizados da Vercel.",
        dedupeKey: `operational:failed:${input.now.toISOString().slice(0, 10)}`,
        context: { error_code: input.code, trigger: input.trigger },
      }),
      FAILURE_ALERT_TIMEOUT_MS,
    );
    return result.sent;
  } catch {
    return false;
  }
}

async function safeSend(
  sender: OperationalAlertSender,
  alert: OperationalAlertInput,
) {
  try {
    return await sender(alert);
  } catch {
    return { sent: false, error: "alert_sender_failed" };
  }
}

function resolveDependencies(
  overrides: Partial<OperationalMonitorDependencies>,
): OperationalMonitorDependencies {
  return {
    repository: overrides.repository ?? createOperationalRepository(),
    asaas: overrides.asaas ?? createAsaasReadClient(),
    alertSender: overrides.alertSender ?? sendOperationalAlert,
    collectAssessment:
      overrides.collectAssessment ?? collectOperationalAssessment,
    now: overrides.now ?? (() => new Date()),
    timeoutMs: normalizeTimeout(overrides.timeoutMs),
  };
}

function monitorErrorCode(error: unknown) {
  if (error instanceof OperationTimeoutError) return "monitor_timeout";
  if (error instanceof OperationalRepositoryError) return error.code;
  if (error instanceof OperationalMonitorError) return error.code;
  return "monitor_execution_failed";
}

function normalizeTimeout(value?: number) {
  return Number.isInteger(value) && value && value >= 5 && value <= 60_000
    ? value
    : DEFAULT_TIMEOUT_MS;
}

class OperationDeadline {
  private readonly expiresAt: number;

  constructor(timeoutMs: number) {
    this.expiresAt = Date.now() + timeoutMs;
  }

  run<T>(operation: () => Promise<T>) {
    const remaining = this.expiresAt - Date.now();
    if (remaining <= 0) return Promise.reject(new OperationTimeoutError());
    return withTimeout(operation(), remaining);
  }
}

class OperationTimeoutError extends Error {
  constructor() {
    super("monitor_timeout");
    this.name = "OperationTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new OperationTimeoutError()), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
