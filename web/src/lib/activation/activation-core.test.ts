import { describe, expect, it } from "vitest";
import {
  buildActivationProgress,
  type ActivationInput,
} from "./activation-core";

const company = {
  business_segment: "construction",
  activation_goal: "sell",
};

function input(overrides: Partial<ActivationInput> = {}): ActivationInput {
  return {
    company,
    customersCount: 0,
    quotes: [],
    projects: [],
    milestones: {
      stageProjectIds: [],
      briefings: [],
      deliverableProjectIds: [],
      managementProjectIds: [],
    },
    ...overrides,
  };
}

function quote(overrides: Partial<ActivationInput["quotes"][number]> = {}) {
  return {
    id: "quote-1",
    title: "Reforma comercial",
    status: "draft",
    effective_status: "draft",
    total_cents: 0,
    project_id: null,
    sent_at: null,
    viewed_at: null,
    approved_at: null,
    ...overrides,
  };
}

describe("buildActivationProgress", () => {
  it("keeps legacy companies on the sales path", () => {
    const progress = buildActivationProgress(
      input({
        company: {
          business_segment: "architecture",
          activation_goal: null,
        },
      }),
    );

    expect(progress.goal).toBe("sell");
    expect(progress.nextStep?.id).toBe("customer");
    expect(progress.nextStep?.href).toBe("/app/clientes/novo?after=quote");
    expect(progress.guideTitle).toBe("Caminho até o primeiro contrato");
  });

  it("finishes the sales path at the first recorded acceptance", () => {
    const progress = buildActivationProgress(
      input({
        customersCount: 1,
        quotes: [
          quote({
            status: "approved",
            effective_status: "approved",
            total_cents: 125_000,
            sent_at: "2026-07-20T10:00:00Z",
            approved_at: "2026-07-20T11:00:00Z",
          }),
        ],
      }),
    );

    expect(progress.steps.map((step) => step.id)).toEqual([
      "customer",
      "quote",
      "share",
      "approval",
    ]);
    expect(progress.isComplete).toBe(true);
    expect(progress.doneCount).toBe(4);
  });

  it("uses direct project creation as the first action for contracted work", () => {
    const progress = buildActivationProgress(
      input({
        company: {
          business_segment: "architecture",
          activation_goal: "existing_project",
        },
      }),
    );

    expect(progress.nextStep?.id).toBe("customer");
    expect(progress.nextStep?.href).toBe(
      "/app/obras/novo?goal=existing_project",
    );
    expect(progress.nextStep?.action).toBe("Cadastrar trabalho");
  });

  it("completes contracted work after a project stage exists", () => {
    const progress = buildActivationProgress(
      input({
        company: {
          business_segment: "architecture",
          activation_goal: "existing_project",
        },
        customersCount: 1,
        projects: [{ id: "project-1" }],
        milestones: {
          stageProjectIds: ["project-1"],
          briefings: [],
          deliverableProjectIds: [],
          managementProjectIds: [],
        },
      }),
    );

    expect(progress.isComplete).toBe(true);
    expect(progress.steps.map((step) => step.id)).toEqual([
      "customer",
      "project",
      "stage",
    ]);
  });

  it("requires a created and shared briefing for the briefing goal", () => {
    const progress = buildActivationProgress(
      input({
        company: {
          business_segment: "interiors",
          activation_goal: "client_briefing",
        },
        customersCount: 1,
        projects: [{ id: "project-1" }],
        milestones: {
          stageProjectIds: [],
          briefings: [{ projectId: "project-1", sharedAt: null }],
          deliverableProjectIds: [],
          managementProjectIds: [],
        },
      }),
    );

    expect(progress.nextStep?.id).toBe("briefing_share");
    expect(progress.nextStep?.href).toBe(
      "/app/obras/project-1?view=briefing",
    );
  });

  it("finishes the engineering path when the first deliverable exists", () => {
    const progress = buildActivationProgress(
      input({
        company: {
          business_segment: "engineering",
          activation_goal: "deliverables",
        },
        customersCount: 1,
        projects: [{ id: "project-1" }],
        milestones: {
          stageProjectIds: [],
          briefings: [],
          deliverableProjectIds: ["project-1"],
          managementProjectIds: [],
        },
      }),
    );

    expect(progress.steps.at(-1)?.id).toBe("deliverable");
    expect(progress.isComplete).toBe(true);
  });

  it("requires a stage and a diary or cost record for execution control", () => {
    const progress = buildActivationProgress(
      input({
        company: {
          business_segment: "construction",
          activation_goal: "execution_control",
        },
        customersCount: 1,
        projects: [{ id: "project-1" }],
        milestones: {
          stageProjectIds: ["project-1"],
          briefings: [],
          deliverableProjectIds: [],
          managementProjectIds: [],
        },
      }),
    );

    expect(progress.nextStep?.id).toBe("management_record");
    expect(progress.nextStep?.href).toBe(
      "/app/obras/project-1?view=gestao#custos",
    );
  });

  it("reuses the project with the furthest relevant progress", () => {
    const progress = buildActivationProgress(
      input({
        company: {
          business_segment: "construction",
          activation_goal: "execution_control",
        },
        customersCount: 1,
        projects: [{ id: "project-new" }, { id: "project-active" }],
        milestones: {
          stageProjectIds: ["project-active"],
          briefings: [],
          deliverableProjectIds: [],
          managementProjectIds: ["project-active"],
        },
      }),
    );

    expect(progress.isComplete).toBe(true);
    expect(progress.steps[1]?.href).toContain("project-active");
  });
});
