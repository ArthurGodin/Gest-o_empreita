import { describe, expect, it } from "vitest";
import { buildOperationalDigest } from "./monitor-alerts-core";
import type { OperationalIssue } from "./monitor-core";

describe("operational monitor digests", () => {
  it("limits technical fingerprints and reports omitted incidents", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      fingerprint: `asaas:payment:remote-missing:00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      checkName: "asaas_payment" as const,
      severity: "critical" as const,
      summary: "Cobranca ausente.",
      context: {},
    })) satisfies OperationalIssue[];

    const digest = buildOperationalDigest({
      kind: "critical",
      items,
      dedupeKey: "operational:critical:2026-07-17",
      metrics: {
        paymentCandidates: 12,
        paymentsChecked: 12,
        subscriptionCandidates: 0,
        subscriptionsChecked: 0,
      },
    });

    expect(digest.severity).toBe("critical");
    expect(digest.context?.fingerprints).toHaveLength(10);
    expect(digest.context?.omitted_count).toBe(2);
    expect(JSON.stringify(digest)).not.toContain("cpf");
  });

  it("uses the resolved severity for recovery summaries", () => {
    const digest = buildOperationalDigest({
      kind: "resolved",
      items: [
        {
          fingerprint: "sinapi:stale",
          checkName: "sinapi_release",
          previousSummary: "Competencia vencida.",
          context: {},
        },
      ],
      dedupeKey: "operational:resolved:2026-07-17",
      metrics: {
        paymentCandidates: 0,
        paymentsChecked: 0,
        subscriptionCandidates: 0,
        subscriptionsChecked: 0,
      },
    });

    expect(digest.severity).toBe("resolved");
    expect(digest.title).toContain("recuperacao");
  });
});
