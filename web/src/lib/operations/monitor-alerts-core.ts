import type { OperationalAlertInput } from "@/lib/alerts";
import type { RecoveryNotification } from "./incident-lifecycle";
import type { OperationalIssue } from "./monitor-core";

type DigestKind = "critical" | "warning" | "resolved";

export function buildOperationalDigest(input: {
  kind: DigestKind;
  items: Array<OperationalIssue | RecoveryNotification>;
  dedupeKey: string;
  metrics: {
    paymentCandidates: number;
    paymentsChecked: number;
    subscriptionCandidates: number;
    subscriptionsChecked: number;
  };
}): OperationalAlertInput {
  const count = input.items.length;
  const checks = [
    ...new Set(input.items.map((item) => item.checkName)),
  ].sort();
  const fingerprints = input.items
    .slice(0, 10)
    .map((item) => item.fingerprint.slice(0, 180));
  const omitted = Math.max(0, count - fingerprints.length);

  return {
    area: "monitoramento_operacional",
    severity: input.kind,
    title: digestTitle(input.kind, count),
    message: digestMessage(input.kind),
    dedupeKey: input.dedupeKey,
    context: {
      incident_count: count,
      checks,
      fingerprints,
      omitted_count: omitted,
      payment_candidates: input.metrics.paymentCandidates,
      payments_checked: input.metrics.paymentsChecked,
      subscription_candidates: input.metrics.subscriptionCandidates,
      subscriptions_checked: input.metrics.subscriptionsChecked,
    },
  };
}

function digestTitle(kind: DigestKind, count: number) {
  if (kind === "critical") {
    return `Monitor encontrou ${count} incidente(s) critico(s)`;
  }
  if (kind === "warning") {
    return `Monitor encontrou ${count} aviso(s)`;
  }
  return `Monitor confirmou ${count} recuperacao(oes)`;
}

function digestMessage(kind: DigestKind) {
  if (kind === "critical") {
    return "Ha divergencia ou falha operacional que pode afetar pagamento, plano ou dados de referencia. Investigue os fingerprints tecnicos.";
  }
  if (kind === "warning") {
    return "Ha sinal operacional que exige acompanhamento, mas o monitor nao realizou nenhuma alteracao automatica.";
  }
  return "Condicoes criticas notificadas anteriormente voltaram ao estado saudavel.";
}
