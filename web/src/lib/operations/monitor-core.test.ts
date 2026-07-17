import { describe, expect, it } from "vitest";
import {
  evaluateAsaasAvailability,
  evaluateCheckoutHealth,
  evaluatePaymentReconciliation,
  evaluateReconciliationCapacity,
  evaluateSinapiHealth,
  evaluateSubscriptionReconciliation,
  evaluateWebhookHealth,
  normalizeRemotePaymentStatus,
  selectPaymentCandidates,
  selectSubscriptionCandidates,
  summarizeCheckResults,
  type LocalPaymentSignal,
  type LocalSubscriptionSignal,
} from "./monitor-core";

const NOW = new Date("2026-07-17T12:00:00.000Z");
const UUIDS = {
  a: "00000000-0000-4000-8000-000000000001",
  b: "00000000-0000-4000-8000-000000000002",
  c: "00000000-0000-4000-8000-000000000003",
};

function payment(
  overrides: Partial<LocalPaymentSignal> = {},
): LocalPaymentSignal {
  return {
    id: UUIDS.a,
    status: "pending",
    paymentProvider: "asaas",
    asaasPaymentId: "pay_1",
    dueDate: "2026-07-17",
    paidAt: null,
    createdAt: "2026-07-16T10:00:00.000Z",
    updatedAt: "2026-07-16T10:00:00.000Z",
    ...overrides,
  };
}

function subscription(
  overrides: Partial<LocalSubscriptionSignal> = {},
): LocalSubscriptionSignal {
  return {
    companyId: UUIDS.a,
    plan: "pro",
    asaasSubscriptionId: "sub_1",
    pendingCheckoutStartedAt: null,
    updatedAt: "2026-07-16T10:00:00.000Z",
    ...overrides,
  };
}

describe("monitor core", () => {
  it("respeita o limite estrito de 10 minutos do webhook", () => {
    const exact = evaluateWebhookHealth(
      [
        {
          createdAt: "2026-07-17T11:50:00.000Z",
          eventType: "PAYMENT_RECEIVED",
          processedAt: null,
          hasProcessingError: false,
        },
      ],
      NOW,
    );
    const late = evaluateWebhookHealth(
      [
        {
          createdAt: "2026-07-17T11:49:59.999Z",
          eventType: "PAYMENT_RECEIVED",
          processedAt: null,
          hasProcessingError: false,
        },
      ],
      NOW,
    );

    expect(exact.state).toBe("healthy");
    expect(late.state).toBe("critical");
    expect(late.issues[0]?.fingerprint).toBe("asaas:webhook:unprocessed");
  });

  it("agrega falhas de webhook sem payload ou identificador pessoal", () => {
    const result = evaluateWebhookHealth(
      [
        {
          createdAt: NOW.toISOString(),
          eventType: "PAYMENT_RECEIVED",
          processedAt: null,
          hasProcessingError: true,
        },
        {
          createdAt: NOW.toISOString(),
          eventType: "<cpf>06024377339</cpf>",
          processedAt: null,
          hasProcessingError: true,
        },
      ],
      NOW,
    );

    expect(result.state).toBe("critical");
    expect(JSON.stringify(result)).not.toContain("06024377339");
    expect(result.issues[0]?.context.event_types).toEqual([
      "PAYMENT_RECEIVED",
      "UNKNOWN",
    ]);
  });

  it("classifica checkout exatamente em 1h, acima de 1h e acima de 24h", () => {
    expect(
      evaluateCheckoutHealth(
        [{ companyId: UUIDS.a, startedAt: "2026-07-17T11:00:00.000Z" }],
        NOW,
      ).state,
    ).toBe("healthy");
    expect(
      evaluateCheckoutHealth(
        [{ companyId: UUIDS.a, startedAt: "2026-07-17T10:59:59.999Z" }],
        NOW,
      ).state,
    ).toBe("warning");
    expect(
      evaluateCheckoutHealth(
        [{ companyId: UUIDS.a, startedAt: "2026-07-16T11:59:59.999Z" }],
        NOW,
      ).state,
    ).toBe("critical");
  });

  it("separa credencial invalida de indisponibilidade transitoria", () => {
    expect(
      evaluateAsaasAvailability({ ok: false, code: "auth_invalid" }).state,
    ).toBe("critical");
    expect(
      evaluateAsaasAvailability({ ok: false, code: "timeout" }).state,
    ).toBe("warning");
    expect(evaluateAsaasAvailability({ ok: true }).state).toBe("healthy");
  });

  it("seleciona cobrancas suspeitas e prioriza nao pagas mais antigas", () => {
    const result = selectPaymentCandidates(
      [
        payment({
          id: UUIDS.c,
          status: "confirmed",
          paidAt: "2026-07-17T11:00:00.000Z",
        }),
        payment({
          id: UUIDS.b,
          status: "overdue",
          createdAt: "2026-07-10T00:00:00.000Z",
        }),
        payment({
          id: UUIDS.a,
          status: "draft",
          createdAt: "2026-07-17T11:44:59.999Z",
        }),
        payment({
          id: "00000000-0000-4000-8000-000000000004",
          status: "pending",
          dueDate: "2026-07-18",
        }),
      ],
      NOW,
      2,
    );

    expect(result.total).toBe(3);
    expect(result.excess).toBe(1);
    expect(result.selected.map((item) => item.id)).toEqual([UUIDS.b, UUIDS.a]);
  });

  it("nao seleciona draft exatamente com 15 minutos ou pagamento antigo", () => {
    const result = selectPaymentCandidates(
      [
        payment({ status: "draft", createdAt: "2026-07-17T11:45:00.000Z" }),
        payment({
          id: UUIDS.b,
          status: "received",
          paidAt: "2026-07-10T11:59:59.999Z",
        }),
      ],
      NOW,
    );
    expect(result.total).toBe(0);
  });

  it("detecta pagamento remoto que ainda nao foi reconhecido localmente", () => {
    const result = evaluatePaymentReconciliation(payment(), {
      kind: "found",
      value: { status: "CONFIRMED" },
    });

    expect(result.state).toBe("critical");
    expect(result.issues[0]?.fingerprint).toContain(
      "remote-paid-local-pending",
    );
  });

  it("detecta pagamento local incompativel e recurso remoto ausente", () => {
    const localPaid = payment({
      status: "received",
      paidAt: "2026-07-17T10:00:00.000Z",
    });
    expect(
      evaluatePaymentReconciliation(localPaid, {
        kind: "found",
        value: { status: "OVERDUE" },
      }).state,
    ).toBe("warning");
    expect(
      evaluatePaymentReconciliation(localPaid, { kind: "not_found" }).state,
    ).toBe("critical");
  });

  it("nao propaga estado remoto arbitrario nem id invalido", () => {
    const result = evaluatePaymentReconciliation(
      payment({ id: "cpf-06024377339" }),
      { kind: "found", value: { status: "<06024377339>" } },
    );
    const serialized = JSON.stringify(result);

    expect(result.state).toBe("warning");
    expect(serialized).not.toContain("06024377339");
    expect(serialized).toContain("invalid-id");
    expect(serialized).toContain("unknown");
  });

  it("normaliza somente estados financeiros conhecidos", () => {
    expect(normalizeRemotePaymentStatus("received_in_cash")).toBe("paid");
    expect(normalizeRemotePaymentStatus("PENDING")).toBe("unpaid");
    expect(normalizeRemotePaymentStatus("REFUNDED")).toBe("terminal");
    expect(normalizeRemotePaymentStatus("novo_status")).toBe("unknown");
  });

  it("prioriza assinatura com checkout recente e depois atualizacao", () => {
    const result = selectSubscriptionCandidates(
      [
        subscription({ companyId: UUIDS.a, updatedAt: "2026-07-17T11:30:00Z" }),
        subscription({
          companyId: UUIDS.b,
          pendingCheckoutStartedAt: "2026-07-17T08:00:00Z",
        }),
        subscription({
          companyId: UUIDS.c,
          pendingCheckoutStartedAt: "2026-07-17T10:00:00Z",
        }),
      ],
      2,
    );

    expect(result.selected.map((item) => item.companyId)).toEqual([
      UUIDS.c,
      UUIDS.b,
    ]);
    expect(result.excess).toBe(1);
  });

  it("detecta plano pago inativo e plano Gratis com assinatura ativa", () => {
    expect(
      evaluateSubscriptionReconciliation(subscription({ plan: "ultimate" }), {
        kind: "found",
        value: { status: "EXPIRED" },
      }).state,
    ).toBe("critical");
    expect(
      evaluateSubscriptionReconciliation(subscription({ plan: "free" }), {
        kind: "found",
        value: { status: "ACTIVE" },
      }).issues[0]?.fingerprint,
    ).toContain("remote-active-local-free");
  });

  it("mantem coerencia de assinaturas validas", () => {
    expect(
      evaluateSubscriptionReconciliation(subscription({ plan: "pro" }), {
        kind: "found",
        value: { status: "ACTIVE" },
      }).state,
    ).toBe("healthy");
    expect(
      evaluateSubscriptionReconciliation(subscription({ plan: "free" }), {
        kind: "found",
        value: { status: "INACTIVE" },
      }).state,
    ).toBe("healthy");
  });

  it("abre aviso quando a reconciliacao excede a capacidade", () => {
    const result = evaluateReconciliationCapacity("payment", 21, 20);
    expect(result.state).toBe("warning");
    expect(result.issues[0]?.context).toEqual({
      candidate_count: 21,
      limit: 20,
      excess_count: 1,
    });
    expect(evaluateReconciliationCapacity("payment", 20, 20).state).toBe(
      "healthy",
    );
  });

  it("classifica idade SINAPI em 60, 61, 75 e 76 dias", () => {
    const release = (competence: string) => ({
      competence,
      revision: 1,
      rowCount: 45_990,
    });

    expect(
      evaluateSinapiHealth(release("2026-05-18"), new Date("2026-07-17T12:00Z"))
        .state,
    ).toBe("critical");
    expect(
      evaluateSinapiHealth(release("2026-05-01"), new Date("2026-06-30T12:00Z"))
        .state,
    ).toBe("healthy");
    expect(
      evaluateSinapiHealth(release("2026-05-01"), new Date("2026-07-01T12:00Z"))
        .state,
    ).toBe("warning");
    expect(
      evaluateSinapiHealth(release("2026-05-01"), new Date("2026-07-15T12:00Z"))
        .state,
    ).toBe("warning");
    expect(
      evaluateSinapiHealth(release("2026-05-01"), new Date("2026-07-16T12:00Z"))
        .state,
    ).toBe("critical");
  });

  it("trata release ausente ou competencia invalida como critica", () => {
    expect(evaluateSinapiHealth(null, NOW).state).toBe("critical");
    expect(
      evaluateSinapiHealth(
        { competence: "2026-06-02", revision: 1, rowCount: 1 },
        NOW,
      ).state,
    ).toBe("critical");
  });

  it("resume verificacoes pela maior severidade", () => {
    const summary = summarizeCheckResults([
      evaluateAsaasAvailability({ ok: true }),
      evaluateCheckoutHealth(
        [{ companyId: UUIDS.a, startedAt: "2026-07-17T10:00:00Z" }],
        NOW,
      ),
      evaluateWebhookHealth(
        [
          {
            createdAt: NOW.toISOString(),
            eventType: "PAYMENT_RECEIVED",
            processedAt: null,
            hasProcessingError: true,
          },
        ],
        NOW,
      ),
    ]);

    expect(summary.state).toBe("critical");
    expect(summary.counts).toEqual({ healthy: 1, warning: 1, critical: 1 });
    expect(summary.issues).toHaveLength(2);
  });
});
