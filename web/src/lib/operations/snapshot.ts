import "server-only";

import type { StoredOperationalIncident } from "./incident-lifecycle";
import {
  evaluateAsaasAvailability,
  evaluateCheckoutHealth,
  evaluatePaymentReconciliation,
  evaluateReconciliationCapacity,
  evaluateSinapiHealth,
  evaluateSubscriptionReconciliation,
  evaluateWebhookHealth,
  selectPaymentCandidates,
  selectSubscriptionCandidates,
  summarizeCheckResults,
  type OperationalIssue,
} from "./monitor-core";
import {
  mapWithConcurrency,
  type AsaasReadClient,
} from "./asaas-reconciliation";
import type {
  OperationalLocalSnapshot,
  OperationalRepository,
} from "./repository";

const RECONCILIATION_LIMIT = 20;
const RECONCILIATION_CONCURRENCY = 4;

export interface OperationalAssessment {
  state: "healthy" | "warning" | "critical";
  counts: { healthy: number; warning: number; critical: number };
  issues: OperationalIssue[];
  managedFingerprints: string[];
  metrics: {
    paymentCandidates: number;
    paymentsChecked: number;
    subscriptionCandidates: number;
    subscriptionsChecked: number;
  };
}

export async function collectOperationalAssessment(input: {
  repository: OperationalRepository;
  asaas: AsaasReadClient;
  now: Date;
}): Promise<OperationalAssessment> {
  const local = await input.repository.loadLocalSnapshot(input.now);
  const paymentSelection = selectPaymentCandidates(
    local.paymentCandidates,
    input.now,
    RECONCILIATION_LIMIT,
  );
  const subscriptionSelection = selectSubscriptionCandidates(
    local.subscriptionCandidates,
    RECONCILIATION_LIMIT,
  );
  const paymentTargets = prioritizeTracked(
    local.trackedPayments,
    paymentSelection.selected,
    (payment) => payment.id,
  );
  const subscriptionTargets = prioritizeTracked(
    local.trackedSubscriptions,
    subscriptionSelection.selected,
    (subscription) => subscription.companyId,
  );
  const paymentCoverageCount =
    local.paymentCandidateCount +
    local.trackedPayments.filter(
      (payment) =>
        selectPaymentCandidates([payment], input.now, 1).total === 0,
    ).length;
  const subscriptionCoverageCount = Math.max(
    local.subscriptionCandidateCount,
    local.trackedSubscriptions.length,
  );
  const results = [
    evaluateWebhookHealth(local.webhooks, input.now),
    evaluateCheckoutHealth(local.checkouts, input.now),
    evaluateSinapiHealth(local.sinapiRelease, input.now),
    evaluateReconciliationCapacity(
      "payment",
      paymentCoverageCount,
      RECONCILIATION_LIMIT,
    ),
    evaluateReconciliationCapacity(
      "subscription",
      subscriptionCoverageCount,
      RECONCILIATION_LIMIT,
    ),
  ];

  const availability = await input.asaas.checkAvailability();
  results.push(evaluateAsaasAvailability(availability));

  let paymentsChecked = 0;
  let subscriptionsChecked = 0;
  if (availability.ok) {
    const paymentResults = await mapWithConcurrency(
      paymentTargets,
      RECONCILIATION_CONCURRENCY,
      async (payment) => {
        const remote = await input.asaas.getPayment(payment.asaasPaymentId ?? "");
        return evaluatePaymentReconciliation(payment, remote);
      },
    );
    const subscriptionResults = await mapWithConcurrency(
      subscriptionTargets,
      RECONCILIATION_CONCURRENCY,
      async (subscription) => {
        const remote = await input.asaas.getSubscription(
          subscription.asaasSubscriptionId,
        );
        return evaluateSubscriptionReconciliation(subscription, remote);
      },
    );
    paymentsChecked = paymentResults.length;
    subscriptionsChecked = subscriptionResults.length;
    results.push(...paymentResults, ...subscriptionResults);
  }

  const summary = summarizeCheckResults(results);
  const orphanedFingerprints = orphanedTrackedFingerprints(local);

  return {
    state: summary.state,
    counts: summary.counts,
    issues: summary.issues,
    managedFingerprints: [
      ...new Set([...summary.managedFingerprints, ...orphanedFingerprints]),
    ].sort(),
    metrics: {
      paymentCandidates: paymentCoverageCount,
      paymentsChecked,
      subscriptionCandidates: subscriptionCoverageCount,
      subscriptionsChecked,
    },
  };
}

function prioritizeTracked<T>(
  tracked: T[],
  candidates: T[],
  keyOf: (value: T) => string,
) {
  const values = new Map<string, T>();
  for (const value of [...tracked, ...candidates]) {
    const key = keyOf(value);
    if (!values.has(key)) values.set(key, value);
  }
  return [...values.values()].slice(0, RECONCILIATION_LIMIT);
}

function orphanedTrackedFingerprints(local: OperationalLocalSnapshot) {
  const paymentIds = new Set(local.trackedPayments.map((payment) => payment.id));
  const companyIds = new Set(
    local.trackedSubscriptions.map((subscription) => subscription.companyId),
  );

  return local.openIncidents.flatMap((incident) => {
    const id = technicalIdAtEnd(incident);
    if (!id) return [];
    if (
      incident.fingerprint.startsWith("asaas:payment:") &&
      !paymentIds.has(id)
    ) {
      return [incident.fingerprint];
    }
    if (
      incident.fingerprint.startsWith("saas:subscription:") &&
      !companyIds.has(id)
    ) {
      return [incident.fingerprint];
    }
    return [];
  });
}

function technicalIdAtEnd(incident: StoredOperationalIncident) {
  return incident.fingerprint.match(
    /:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/,
  )?.[1] ?? null;
}
