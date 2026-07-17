import { describe, expect, it, vi } from "vitest";
import type { AsaasReadClient } from "./asaas-reconciliation";
import type { StoredOperationalIncident } from "./incident-lifecycle";
import type {
  LocalPaymentSignal,
  LocalSubscriptionSignal,
} from "./monitor-core";
import type {
  OperationalLocalSnapshot,
  OperationalRepository,
} from "./repository";
import { collectOperationalAssessment } from "./snapshot";

vi.mock("server-only", () => ({}));

const NOW = new Date("2026-07-17T12:00:00.000Z");
const UUID = (value: number) =>
  `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;

function payment(index: number, status: LocalPaymentSignal["status"] = "overdue") {
  return {
    id: UUID(index),
    status,
    paymentProvider: "asaas",
    asaasPaymentId: `pay_${index}`,
    dueDate: "2026-07-16",
    paidAt: null,
    createdAt: `2026-07-${String(Math.max(1, 16 - index)).padStart(2, "0")}T10:00:00.000Z`,
    updatedAt: "2026-07-17T10:00:00.000Z",
  } satisfies LocalPaymentSignal;
}

function subscription(index: number) {
  return {
    companyId: UUID(index),
    plan: "pro",
    asaasSubscriptionId: `sub_${index}`,
    pendingCheckoutStartedAt: null,
    updatedAt: `2026-07-17T${String(index % 24).padStart(2, "0")}:00:00.000Z`,
  } satisfies LocalSubscriptionSignal;
}

function openIncident(
  fingerprint: string,
  checkName: StoredOperationalIncident["checkName"],
): StoredOperationalIncident {
  return {
    fingerprint,
    checkName,
    severity: "critical",
    status: "open",
    summary: "Problema operacional.",
    context: {},
    firstSeenAt: "2026-07-16T10:00:00.000Z",
    lastSeenAt: "2026-07-17T10:00:00.000Z",
    lastNotifiedAt: null,
    resolvedAt: null,
    occurrenceCount: 1,
  };
}

function localSnapshot(
  overrides: Partial<OperationalLocalSnapshot> = {},
): OperationalLocalSnapshot {
  return {
    webhooks: [],
    checkouts: [],
    paymentCandidates: [],
    paymentCandidateCount: 0,
    trackedPayments: [],
    subscriptionCandidates: [],
    subscriptionCandidateCount: 0,
    trackedSubscriptions: [],
    sinapiRelease: {
      competence: "2026-07-01",
      revision: 1,
      rowCount: 45_990,
    },
    openIncidents: [],
    ...overrides,
  };
}

function repository(snapshot: OperationalLocalSnapshot) {
  return {
    loadLocalSnapshot: vi.fn(async () => snapshot),
  } as unknown as OperationalRepository;
}

function asaas(overrides: Partial<AsaasReadClient> = {}): AsaasReadClient {
  return {
    checkAvailability: vi.fn(async () => ({ ok: true as const })),
    getPayment: vi.fn(async () => ({
      kind: "found" as const,
      value: { status: "PENDING" },
    })),
    getSubscription: vi.fn(async () => ({
      kind: "found" as const,
      value: { status: "ACTIVE" },
    })),
    ...overrides,
  };
}

describe("operational snapshot", () => {
  it("retorna saudavel sem dados suspeitos", async () => {
    const result = await collectOperationalAssessment({
      repository: repository(localSnapshot()),
      asaas: asaas(),
      now: NOW,
    });

    expect(result.state).toBe("healthy");
    expect(result.issues).toHaveLength(0);
    expect(result.metrics).toEqual({
      paymentCandidates: 0,
      paymentsChecked: 0,
      subscriptionCandidates: 0,
      subscriptionsChecked: 0,
    });
  });

  it("detecta divergencias remotas sem ultrapassar 20 consultas", async () => {
    const payments = Array.from({ length: 24 }, (_, index) => payment(index + 1));
    const subscriptions = Array.from({ length: 23 }, (_, index) =>
      subscription(index + 30),
    );
    const client = asaas({
      getPayment: vi.fn(async () => ({
        kind: "found" as const,
        value: { status: "CONFIRMED" },
      })),
      getSubscription: vi.fn(async () => ({
        kind: "found" as const,
        value: { status: "EXPIRED" },
      })),
    });
    const result = await collectOperationalAssessment({
      repository: repository(
        localSnapshot({
          paymentCandidates: payments,
          paymentCandidateCount: payments.length,
          subscriptionCandidates: subscriptions,
          subscriptionCandidateCount: subscriptions.length,
        }),
      ),
      asaas: client,
      now: NOW,
    });

    expect(client.getPayment).toHaveBeenCalledTimes(20);
    expect(client.getSubscription).toHaveBeenCalledTimes(20);
    expect(result.state).toBe("critical");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fingerprint: "asaas:payment:reconciliation-truncated",
        }),
        expect.objectContaining({
          fingerprint: "saas:subscription:reconciliation-truncated",
        }),
      ]),
    );
  });

  it("prioriza registros com incidente aberto", async () => {
    const tracked = payment(99);
    const client = asaas();
    await collectOperationalAssessment({
      repository: repository(
        localSnapshot({
          paymentCandidates: Array.from({ length: 20 }, (_, index) =>
            payment(index + 1),
          ),
          paymentCandidateCount: 20,
          trackedPayments: [tracked],
          openIncidents: [
            openIncident(
              `asaas:payment:remote-paid-local-pending:${tracked.id}`,
              "asaas_payment",
            ),
          ],
        }),
      ),
      asaas: client,
      now: NOW,
    });

    expect(client.getPayment).toHaveBeenCalledTimes(20);
    expect(client.getPayment).toHaveBeenNthCalledWith(1, tracked.asaasPaymentId);
  });

  it("nao consulta itens quando o health check do Asaas falha", async () => {
    const client = asaas({
      checkAvailability: vi.fn(async () => ({
        ok: false as const,
        code: "timeout" as const,
      })),
    });
    const result = await collectOperationalAssessment({
      repository: repository(
        localSnapshot({
          paymentCandidates: [payment(1)],
          paymentCandidateCount: 1,
          subscriptionCandidates: [subscription(2)],
          subscriptionCandidateCount: 1,
        }),
      ),
      asaas: client,
      now: NOW,
    });

    expect(client.getPayment).not.toHaveBeenCalled();
    expect(client.getSubscription).not.toHaveBeenCalled();
    expect(result.state).toBe("warning");
    expect(result.managedFingerprints).not.toContain(
      `asaas:payment:remote-paid-local-pending:${UUID(1)}`,
    );
  });

  it("permite resolver incidente cujo registro local deixou de existir", async () => {
    const fingerprint =
      `asaas:payment:remote-paid-local-pending:${UUID(77)}`;
    const result = await collectOperationalAssessment({
      repository: repository(
        localSnapshot({
          openIncidents: [openIncident(fingerprint, "asaas_payment")],
        }),
      ),
      asaas: asaas(),
      now: NOW,
    });

    expect(result.managedFingerprints).toContain(fingerprint);
    expect(result.issues).toHaveLength(0);
  });
});
