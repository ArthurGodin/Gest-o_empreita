import { describe, expect, it } from "vitest";
import {
  buildOperationalHealthViewModel,
  unavailableOperationalHealthViewModel,
  type DashboardRunSignal,
} from "./health-dashboard-core";

const NOW = new Date("2026-07-20T12:00:00.000Z");

function run(
  status: DashboardRunSignal["status"],
  checkedAt: string,
): DashboardRunSignal {
  return {
    status,
    startedAt: checkedAt,
    finishedAt: status === "running" ? null : checkedAt,
    incidentCount: 0,
    alertCount: 0,
  };
}

function build(overrides: Partial<Parameters<typeof buildOperationalHealthViewModel>[0]> = {}) {
  return buildOperationalHealthViewModel({
    now: NOW,
    run: run("healthy", "2026-07-20T11:30:00.000Z"),
    incidents: [],
    criticalCount: 0,
    warningCount: 0,
    ...overrides,
  });
}

describe("operational health dashboard", () => {
  it("marks a current healthy run without incidents as healthy", () => {
    const result = build();

    expect(result.state).toBe("healthy");
    expect(result.freshness).toBe("current");
    expect(result.openCounts.total).toBe(0);
  });

  it("applies the running, late and stale thresholds exactly", () => {
    expect(build({ run: run("running", "2026-07-20T11:45:00.000Z") }).state).toBe("checking");
    expect(build({ run: run("running", "2026-07-20T11:44:00.000Z") }).state).toBe("critical");
    expect(build({ run: run("healthy", "2026-07-19T00:00:00.000Z") }).state).toBe("healthy");
    expect(build({ run: run("healthy", "2026-07-18T23:59:00.000Z") }).state).toBe("warning");
    expect(build({ run: run("healthy", "2026-07-18T12:00:00.000Z") }).state).toBe("warning");
    expect(build({ run: run("healthy", "2026-07-18T11:59:00.000Z") }).state).toBe("critical");
  });

  it("never lets a run hide open incidents", () => {
    expect(build({ criticalCount: 1 }).state).toBe("critical");
    expect(build({ warningCount: 2 }).state).toBe("warning");
    expect(build({ run: run("failed", "2026-07-20T11:30:00.000Z") }).state).toBe("critical");
  });

  it("maps incidents to fixed copy and removes unknown technical values", () => {
    const result = build({
      warningCount: 1,
      incidents: [
        {
          checkName: "asaas_payment:private:8df90f2d-51b2-4ad8-9dac-f886165736c1",
          severity: "warning",
          firstSeenAt: "2026-07-20T10:00:00.000Z",
          lastSeenAt: "2026-07-20T11:00:00.000Z",
          occurrenceCount: 2,
        },
      ],
    });
    const serialized = JSON.stringify(result);

    expect(result.incidents[0]?.area).toBe("Área operacional");
    expect(serialized).not.toContain("8df90f2d");
    expect(serialized).not.toContain("checkName");
    expect(serialized).not.toContain("fingerprint");
    expect(serialized).not.toContain("safe_context");
  });

  it("limits the visible incident list and reports hidden items", () => {
    const incidents = Array.from({ length: 25 }, (_, index) => ({
      checkName: "asaas_webhook",
      severity: "critical" as const,
      firstSeenAt: `2026-07-20T10:${String(index).padStart(2, "0")}:00.000Z`,
      lastSeenAt: "2026-07-20T11:00:00.000Z",
      occurrenceCount: 1,
    }));
    const result = build({ incidents, criticalCount: 25 });

    expect(result.incidents).toHaveLength(20);
    expect(result.hasMoreIncidents).toBe(true);
  });

  it("returns a closed unavailable model when reading fails", () => {
    const result = unavailableOperationalHealthViewModel(NOW);

    expect(result.state).toBe("unavailable");
    expect(result.lastRun).toBeNull();
    expect(result.incidents).toEqual([]);
  });
});
