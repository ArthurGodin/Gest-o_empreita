import "server-only";

import { logServerWarning } from "@/lib/log";
import {
  createAdminClient,
  type AdminClient,
} from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";
import {
  buildOperationalHealthViewModel,
  unavailableOperationalHealthViewModel,
  type DashboardIncidentSignal,
  type DashboardRunSignal,
  type OperationalHealthViewModel,
  type OperationalRunState,
} from "./health-dashboard-core";

const RUN_SELECT =
  "status, started_at, finished_at, incident_count, alert_count";
const INCIDENT_SELECT =
  "check_name, severity, first_seen_at, last_seen_at, occurrence_count";
const MAX_VISIBLE_INCIDENTS = 20;

type RunRow = Pick<
  Tables<"operational_monitor_runs">,
  "status" | "started_at" | "finished_at" | "incident_count" | "alert_count"
>;

type IncidentRow = Pick<
  Tables<"operational_incidents">,
  | "check_name"
  | "severity"
  | "first_seen_at"
  | "last_seen_at"
  | "occurrence_count"
>;

export async function loadOperationalHealthDashboard(
  now = new Date(),
  admin?: AdminClient,
): Promise<OperationalHealthViewModel> {
  try {
    const operationalAdmin = admin ?? createAdminClient();
    const [runResult, criticalResult, warningResult] = await Promise.all([
      operationalAdmin
        .from("operational_monitor_runs")
        .select(RUN_SELECT)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      incidentQuery(operationalAdmin, "critical"),
      incidentQuery(operationalAdmin, "warning"),
    ]);

    if (runResult.error || criticalResult.error || warningResult.error) {
      throw new Error("operational_health_query_failed");
    }

    const criticalRows = (criticalResult.data ?? []) as IncidentRow[];
    const warningRows = (warningResult.data ?? []) as IncidentRow[];
    const incidents = [...criticalRows, ...warningRows]
      .slice(0, MAX_VISIBLE_INCIDENTS)
      .map(mapIncidentRow);

    return buildOperationalHealthViewModel({
      now,
      run: runResult.data ? mapRunRow(runResult.data as RunRow) : null,
      incidents,
      criticalCount: criticalResult.count ?? criticalRows.length,
      warningCount: warningResult.count ?? warningRows.length,
    });
  } catch {
    logServerWarning("ops.dashboard.read_failed", {
      error_code: "operational_health_read_failed",
    });
    return unavailableOperationalHealthViewModel(now);
  }
}

function incidentQuery(
  admin: AdminClient,
  severity: "critical" | "warning",
) {
  return admin
    .from("operational_incidents")
    .select(INCIDENT_SELECT, { count: "exact" })
    .eq("status", "open")
    .eq("severity", severity)
    .order("last_seen_at", { ascending: false })
    .limit(MAX_VISIBLE_INCIDENTS);
}

function mapRunRow(row: RunRow): DashboardRunSignal {
  if (!isOperationalRunState(row.status)) {
    throw new Error("operational_health_run_status_invalid");
  }
  return {
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    incidentCount: row.incident_count,
    alertCount: row.alert_count,
  };
}

function mapIncidentRow(row: IncidentRow): DashboardIncidentSignal {
  if (row.severity !== "warning" && row.severity !== "critical") {
    throw new Error("operational_health_incident_severity_invalid");
  }
  return {
    checkName: row.check_name,
    severity: row.severity,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: row.occurrence_count,
  };
}

function isOperationalRunState(value: string): value is OperationalRunState {
  return ["running", "healthy", "warning", "critical", "failed"].includes(
    value,
  );
}
