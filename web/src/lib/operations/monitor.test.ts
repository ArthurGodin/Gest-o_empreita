import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredOperationalIncident } from "./incident-lifecycle";
import type { OperationalIssue } from "./monitor-core";
import type { OperationalRepository } from "./repository";
import type { OperationalAssessment } from "./snapshot";
import {
  runOperationalMonitor,
  type OperationalAlertSender,
} from "./monitor";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
  },
}));
vi.mock("@/lib/env-server", () => ({
  serverEnv: {
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    ASAAS_API_URL: "http://127.0.0.1:3999/v3",
  },
}));
vi.mock("@/lib/alerts", () => ({
  sendOperationalAlert: vi.fn(),
}));

const NOW = new Date("2026-07-17T12:00:00.000Z");

function criticalIssue(): OperationalIssue {
  return {
    fingerprint: "asaas:webhook:unprocessed",
    checkName: "asaas_webhook",
    severity: "critical",
    summary: "Webhook pendente.",
    context: { count: 1 },
  };
}

function assessment(
  overrides: Partial<OperationalAssessment> = {},
): OperationalAssessment {
  return {
    state: "healthy",
    counts: { healthy: 6, warning: 0, critical: 0 },
    issues: [],
    managedFingerprints: [],
    metrics: {
      paymentCandidates: 0,
      paymentsChecked: 0,
      subscriptionCandidates: 0,
      subscriptionsChecked: 0,
    },
    ...overrides,
  };
}

function repository(
  overrides: Partial<OperationalRepository> = {},
): OperationalRepository & Record<string, ReturnType<typeof vi.fn>> {
  return {
    startRun: vi.fn(async () => ({ kind: "started" as const, id: "run-1" })),
    finishRun: vi.fn(async () => undefined),
    loadLocalSnapshot: vi.fn(),
    getIncidents: vi.fn(async () => []),
    applyIncidentMutations: vi.fn(async () => undefined),
    markIncidentsNotified: vi.fn(async () => undefined),
    ...overrides,
  } as OperationalRepository & Record<string, ReturnType<typeof vi.fn>>;
}

function sender(sent = true) {
  return vi.fn(async () =>
    sent ? { sent: true } : { sent: false, error: "disabled" },
  ) as OperationalAlertSender & ReturnType<typeof vi.fn>;
}

function dependencies(input: {
  repository: OperationalRepository;
  result?: OperationalAssessment;
  sender?: OperationalAlertSender;
  collector?: () => Promise<OperationalAssessment>;
  timeoutMs?: number;
}) {
  return {
    repository: input.repository,
    asaas: {} as never,
    alertSender: input.sender ?? sender(),
    collectAssessment:
      input.collector ?? vi.fn(async () => input.result ?? assessment()),
    now: () => NOW,
    timeoutMs: input.timeoutMs ?? 1_000,
  };
}

describe("operational monitor executor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("absorve run duplicado sem consultar ou notificar", async () => {
    const repo = repository({
      startRun: vi.fn(async () => ({ kind: "duplicate" as const })),
    });
    const collect = vi.fn(async () => assessment());
    const alertSender = sender();

    await expect(
      runOperationalMonitor(
        { runKey: "cron:2026-07-17", trigger: "cron" },
        dependencies({ repository: repo, collector: collect, sender: alertSender }),
      ),
    ).resolves.toEqual({ status: "skipped", alertCount: 0, incidentCount: 0 });
    expect(collect).not.toHaveBeenCalled();
    expect(alertSender).not.toHaveBeenCalled();
    expect(repo.finishRun).not.toHaveBeenCalled();
  });

  it("conclui run saudavel sem email", async () => {
    const repo = repository();
    const alertSender = sender();
    const result = await runOperationalMonitor(
      { runKey: "manual:00000000-0000-4000-8000-000000000001", trigger: "manual" },
      dependencies({ repository: repo, sender: alertSender }),
    );

    expect(result).toEqual({ status: "healthy", alertCount: 0, incidentCount: 0 });
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ status: "healthy", errorCode: null }),
    );
    expect(alertSender).not.toHaveBeenCalled();
  });

  it("persiste, envia digest e marca critico somente apos confirmacao", async () => {
    const repo = repository();
    const alertSender = sender();
    const issue = criticalIssue();
    const result = await runOperationalMonitor(
      { runKey: "manual:00000000-0000-4000-8000-000000000002", trigger: "manual" },
      dependencies({
        repository: repo,
        sender: alertSender,
        result: assessment({
          state: "critical",
          counts: { healthy: 5, warning: 0, critical: 1 },
          issues: [issue],
          managedFingerprints: [issue.fingerprint],
        }),
      }),
    );

    expect(result).toEqual({ status: "critical", alertCount: 1, incidentCount: 1 });
    expect(repo.applyIncidentMutations).toHaveBeenCalledBefore(alertSender as never);
    expect(repo.markIncidentsNotified).toHaveBeenCalledWith(
      [issue.fingerprint],
      NOW.toISOString(),
    );
    expect(alertSender).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "critical",
        dedupeKey: "operational:critical:2026-07-17",
      }),
    );
  });

  it("mantem incidente notificavel quando o email falha", async () => {
    const repo = repository();
    const issue = criticalIssue();
    await runOperationalMonitor(
      { runKey: "manual:00000000-0000-4000-8000-000000000003", trigger: "manual" },
      dependencies({
        repository: repo,
        sender: sender(false),
        result: assessment({
          state: "critical",
          counts: { healthy: 5, warning: 0, critical: 1 },
          issues: [issue],
          managedFingerprints: [issue.fingerprint],
        }),
      }),
    );

    expect(repo.markIncidentsNotified).not.toHaveBeenCalled();
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ errorCode: "alert_send_failed", alertCount: 0 }),
    );
  });

  it("envia recuperacao uma unica vez para critico notificado", async () => {
    const existing: StoredOperationalIncident = {
      fingerprint: "sinapi:stale",
      checkName: "sinapi_release",
      severity: "critical",
      status: "open",
      summary: "SINAPI vencido.",
      context: { age_days: 80 },
      firstSeenAt: "2026-07-01T00:00:00.000Z",
      lastSeenAt: "2026-07-16T12:00:00.000Z",
      lastNotifiedAt: "2026-07-16T12:00:00.000Z",
      resolvedAt: null,
      occurrenceCount: 3,
    };
    const repo = repository({ getIncidents: vi.fn(async () => [existing]) });
    const alertSender = sender();
    await runOperationalMonitor(
      { runKey: "manual:00000000-0000-4000-8000-000000000004", trigger: "manual" },
      dependencies({
        repository: repo,
        sender: alertSender,
        result: assessment({ managedFingerprints: [existing.fingerprint] }),
      }),
    );

    expect(alertSender).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "resolved" }),
    );
    expect(repo.markIncidentsNotified).toHaveBeenCalledWith(
      [existing.fingerprint],
      NOW.toISOString(),
    );
  });

  it("marca run como failed e envia alerta generico no timeout", async () => {
    const repo = repository();
    const alertSender = sender();
    const never = () => new Promise<OperationalAssessment>(() => undefined);

    await expect(
      runOperationalMonitor(
        { runKey: "manual:00000000-0000-4000-8000-000000000005", trigger: "manual" },
        dependencies({
          repository: repo,
          sender: alertSender,
          collector: never,
          timeoutMs: 10,
        }),
      ),
    ).rejects.toMatchObject({ code: "monitor_timeout" });
    expect(alertSender).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Monitor operacional nao concluiu",
        context: { error_code: "monitor_timeout", trigger: "manual" },
      }),
    );
    expect(repo.finishRun).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ status: "failed", errorCode: "monitor_timeout" }),
    );
  });
});
