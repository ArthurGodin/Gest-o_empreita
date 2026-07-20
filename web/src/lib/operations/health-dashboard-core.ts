import type { OperationalCheckName } from "./monitor-core";

export type OperationalDashboardState =
  | "healthy"
  | "warning"
  | "critical"
  | "checking"
  | "unknown"
  | "unavailable";

export type OperationalRunState =
  | "running"
  | "healthy"
  | "warning"
  | "critical"
  | "failed";

export interface DashboardRunSignal {
  status: OperationalRunState;
  startedAt: string;
  finishedAt: string | null;
  incidentCount: number;
  alertCount: number;
}

export interface DashboardIncidentSignal {
  checkName: string;
  severity: "warning" | "critical";
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
}

export interface OperationalIncidentViewModel {
  area: string;
  severity: "warning" | "critical";
  summary: string;
  action: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
}

export interface OperationalHealthViewModel {
  state: OperationalDashboardState;
  freshness: "current" | "late" | "stale" | "running" | "missing";
  generatedAt: string;
  lastRun: {
    status: OperationalRunState;
    checkedAt: string;
    ageMinutes: number;
    incidentCount: number;
    alertCount: number;
  } | null;
  openCounts: {
    critical: number;
    warning: number;
    total: number;
  };
  incidents: OperationalIncidentViewModel[];
  hasMoreIncidents: boolean;
}

interface DashboardInput {
  now: Date;
  run: DashboardRunSignal | null;
  incidents: DashboardIncidentSignal[];
  criticalCount: number;
  warningCount: number;
}

const STATE_WEIGHT: Record<OperationalDashboardState, number> = {
  healthy: 0,
  unknown: 1,
  checking: 2,
  warning: 3,
  critical: 4,
  unavailable: 5,
};

const CHECK_COPY: Record<
  OperationalCheckName,
  { area: string; summary: string; action: string }
> = {
  asaas_webhook: {
    area: "Webhook Asaas",
    summary: "Eventos de pagamento precisam de verificação.",
    action: "Confira as entregas recentes do webhook no Asaas e na Vercel.",
  },
  saas_checkout: {
    area: "Checkout dos planos",
    summary: "Há checkout que não concluiu no intervalo esperado.",
    action: "Confira o checkout no Prumo e o link correspondente no Asaas.",
  },
  asaas_availability: {
    area: "Conexão com o Asaas",
    summary: "A disponibilidade ou credencial do Asaas precisa de verificação.",
    action: "Confira a integração e as variáveis do Asaas na Vercel.",
  },
  asaas_payment: {
    area: "Conciliação de cobranças",
    summary: "Há cobrança com estado divergente entre Prumo e Asaas.",
    action: "Compare a cobrança nos painéis antes de alterar qualquer estado.",
  },
  saas_subscription: {
    area: "Assinaturas do Prumo",
    summary: "Há assinatura com estado que precisa de conciliação.",
    action: "Compare plano e assinatura no Prumo e no Asaas.",
  },
  sinapi_release: {
    area: "Base SINAPI",
    summary: "A competência publicada precisa de atualização.",
    action: "Confira a competência oficial antes de publicar uma nova release.",
  },
};

const UNKNOWN_CHECK_COPY = {
  area: "Área operacional",
  summary: "Há um sinal operacional que precisa de verificação.",
  action: "Consulte o alerta operacional e os logs da Vercel.",
};

export function buildOperationalHealthViewModel(
  input: DashboardInput,
): OperationalHealthViewModel {
  const nowIso = input.now.toISOString();
  const total = input.criticalCount + input.warningCount;
  const incidents = input.incidents.slice(0, 20).map(mapIncident);
  let state: OperationalDashboardState = "unknown";
  let freshness: OperationalHealthViewModel["freshness"] = "missing";
  let lastRun: OperationalHealthViewModel["lastRun"] = null;

  if (input.run) {
    const checkedAt = input.run.finishedAt ?? input.run.startedAt;
    const ageMinutes = minutesBetween(checkedAt, input.now);
    lastRun = {
      status: input.run.status,
      checkedAt,
      ageMinutes,
      incidentCount: input.run.incidentCount,
      alertCount: input.run.alertCount,
    };

    if (input.run.status === "running") {
      freshness = "running";
      state = ageMinutes > 15 ? "critical" : "checking";
    } else {
      freshness = ageMinutes > 48 * 60 ? "stale" : ageMinutes > 36 * 60 ? "late" : "current";
      state = runState(input.run.status);
      if (freshness === "stale") state = strongerState(state, "critical");
      if (freshness === "late") state = strongerState(state, "warning");
    }
  }

  if (input.criticalCount > 0) state = strongerState(state, "critical");
  else if (input.warningCount > 0) state = strongerState(state, "warning");

  return {
    state,
    freshness,
    generatedAt: nowIso,
    lastRun,
    openCounts: {
      critical: input.criticalCount,
      warning: input.warningCount,
      total,
    },
    incidents,
    hasMoreIncidents: total > incidents.length,
  };
}

export function unavailableOperationalHealthViewModel(
  now: Date,
): OperationalHealthViewModel {
  return {
    state: "unavailable",
    freshness: "missing",
    generatedAt: now.toISOString(),
    lastRun: null,
    openCounts: { critical: 0, warning: 0, total: 0 },
    incidents: [],
    hasMoreIncidents: false,
  };
}

function mapIncident(
  incident: DashboardIncidentSignal,
): OperationalIncidentViewModel {
  const copy = isOperationalCheckName(incident.checkName)
    ? CHECK_COPY[incident.checkName]
    : UNKNOWN_CHECK_COPY;

  return {
    ...copy,
    severity: incident.severity,
    firstSeenAt: incident.firstSeenAt,
    lastSeenAt: incident.lastSeenAt,
    occurrenceCount: Math.max(1, Math.trunc(incident.occurrenceCount)),
  };
}

function runState(status: OperationalRunState): OperationalDashboardState {
  if (status === "failed" || status === "critical") return "critical";
  if (status === "warning") return "warning";
  if (status === "running") return "checking";
  return "healthy";
}

function strongerState(
  current: OperationalDashboardState,
  candidate: OperationalDashboardState,
) {
  return STATE_WEIGHT[candidate] > STATE_WEIGHT[current] ? candidate : current;
}

function minutesBetween(value: string, now: Date) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000));
}

function isOperationalCheckName(value: string): value is OperationalCheckName {
  return Object.prototype.hasOwnProperty.call(CHECK_COPY, value);
}
