import { describe, expect, it } from "vitest";
import {
  buildDailyDigestKey,
  planIncidentLifecycle,
  type StoredOperationalIncident,
} from "./incident-lifecycle";
import type { OperationalIssue } from "./monitor-core";

const NOW = new Date("2026-07-17T12:00:00.000Z");

function issue(
  overrides: Partial<OperationalIssue> = {},
): OperationalIssue {
  return {
    fingerprint: "asaas:webhook:unprocessed",
    checkName: "asaas_webhook",
    severity: "critical",
    summary: "Webhook permanece pendente.",
    context: { count: 1 },
    ...overrides,
  };
}

function stored(
  overrides: Partial<StoredOperationalIncident> = {},
): StoredOperationalIncident {
  return {
    fingerprint: "asaas:webhook:unprocessed",
    checkName: "asaas_webhook",
    severity: "critical",
    status: "open",
    summary: "Webhook permanece pendente.",
    context: { count: 1 },
    firstSeenAt: "2026-07-16T10:00:00.000Z",
    lastSeenAt: "2026-07-17T10:00:00.000Z",
    lastNotifiedAt: "2026-07-17T10:00:00.000Z",
    resolvedAt: null,
    occurrenceCount: 2,
    ...overrides,
  };
}

describe("incident lifecycle", () => {
  it("abre e notifica incidente novo", () => {
    const plan = planIncidentLifecycle({
      now: NOW,
      issues: [issue()],
      managedFingerprints: ["asaas:webhook:unprocessed"],
      existing: [],
    });

    expect(plan.mutations).toEqual([
      expect.objectContaining({ kind: "upsert_open", reason: "new" }),
    ]);
    expect(plan.notifications.critical).toHaveLength(1);
    expect(plan.notifications.warning).toHaveLength(0);
  });

  it("atualiza recorrencia sem notificar antes de 24 horas", () => {
    const plan = planIncidentLifecycle({
      now: NOW,
      issues: [issue({ context: { count: 2 } })],
      managedFingerprints: ["asaas:webhook:unprocessed"],
      existing: [stored()],
    });

    const mutation = plan.mutations[0];
    expect(mutation).toMatchObject({ kind: "upsert_open", reason: "recurring" });
    if (mutation?.kind !== "upsert_open") throw new Error("unexpected mutation");
    expect(mutation.record.occurrenceCount).toBe(3);
    expect(mutation.record.context).toEqual({ count: 2 });
    expect(plan.notifications.critical).toHaveLength(0);
  });

  it("notifica recorrencia exatamente depois de 24 horas", () => {
    const plan = planIncidentLifecycle({
      now: NOW,
      issues: [issue()],
      managedFingerprints: ["asaas:webhook:unprocessed"],
      existing: [
        stored({ lastNotifiedAt: "2026-07-16T12:00:00.000Z" }),
      ],
    });
    expect(plan.notifications.critical).toHaveLength(1);
  });

  it("notifica escalada de warning para critical imediatamente", () => {
    const plan = planIncidentLifecycle({
      now: NOW,
      issues: [issue({ severity: "critical" })],
      managedFingerprints: ["asaas:webhook:unprocessed"],
      existing: [stored({ severity: "warning" })],
    });
    expect(plan.notifications.critical).toHaveLength(1);
  });

  it("reabre e notifica incidente resolvido", () => {
    const plan = planIncidentLifecycle({
      now: NOW,
      issues: [issue()],
      managedFingerprints: ["asaas:webhook:unprocessed"],
      existing: [
        stored({
          status: "resolved",
          resolvedAt: "2026-07-17T11:00:00.000Z",
        }),
      ],
    });

    expect(plan.mutations[0]).toMatchObject({
      kind: "upsert_open",
      reason: "reopened",
      record: { status: "open", resolvedAt: null },
    });
    expect(plan.notifications.critical).toHaveLength(1);
  });

  it("resolve critico notificado e gera uma recuperacao", () => {
    const plan = planIncidentLifecycle({
      now: NOW,
      issues: [],
      managedFingerprints: ["asaas:webhook:unprocessed"],
      existing: [stored()],
    });

    expect(plan.mutations).toEqual([
      {
        kind: "resolve",
        fingerprint: "asaas:webhook:unprocessed",
        resolvedAt: NOW.toISOString(),
      },
    ]);
    expect(plan.notifications.resolved).toHaveLength(1);
  });

  it("resolve warning ou critico nunca notificado sem email de recuperacao", () => {
    for (const incident of [
      stored({ severity: "warning" }),
      stored({ severity: "critical", lastNotifiedAt: null }),
    ]) {
      const plan = planIncidentLifecycle({
        now: NOW,
        issues: [],
        managedFingerprints: [incident.fingerprint],
        existing: [incident],
      });
      expect(plan.mutations).toHaveLength(1);
      expect(plan.notifications.resolved).toHaveLength(0);
    }
  });

  it("nao resolve incidente fora da cobertura observada", () => {
    const plan = planIncidentLifecycle({
      now: NOW,
      issues: [],
      managedFingerprints: ["sinapi:stale"],
      existing: [stored()],
    });
    expect(plan.mutations).toHaveLength(0);
  });

  it("falha de envio preserva notificabilidade", () => {
    const persistedAfterFailedEmail = stored({
      lastNotifiedAt: null,
      occurrenceCount: 1,
    });
    const nextRun = planIncidentLifecycle({
      now: NOW,
      issues: [issue()],
      managedFingerprints: ["asaas:webhook:unprocessed"],
      existing: [persistedAfterFailedEmail],
    });
    expect(nextRun.notifications.critical).toHaveLength(1);
  });

  it("rejeita fingerprints duplicados", () => {
    expect(() =>
      planIncidentLifecycle({
        now: NOW,
        issues: [issue(), issue()],
        managedFingerprints: [],
        existing: [],
      }),
    ).toThrow("Duplicate operational issue fingerprint");
  });

  it("rejeita reutilizacao do fingerprint por outro check", () => {
    expect(() =>
      planIncidentLifecycle({
        now: NOW,
        issues: [issue({ checkName: "saas_checkout" })],
        managedFingerprints: [],
        existing: [stored()],
      }),
    ).toThrow("Incident fingerprint changed operational check");
  });

  it("gera chave de digest por tipo e dia UTC", () => {
    expect(buildDailyDigestKey("critical", NOW)).toBe(
      "operational:critical:2026-07-17",
    );
    expect(
      buildDailyDigestKey("critical", new Date("2026-07-18T00:00:00Z")),
    ).not.toBe(buildDailyDigestKey("critical", NOW));
  });
});
