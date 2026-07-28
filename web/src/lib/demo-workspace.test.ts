import { describe, expect, it } from "vitest";
import {
  buildDemoWorkspaceSteps,
  demoWorkspaceTitle,
  type DemoWorkspaceSnapshot,
} from "./demo-workspace";

const snapshot: DemoWorkspaceSnapshot = {
  quoteId: "quote-id",
  quoteTitle: "Demo - Projeto residencial",
  shareToken: "safe_token",
  projectId: "project-id",
  projectName: "Demo - Residencial",
};

describe("demo workspace route", () => {
  it("includes architecture-specific stages", () => {
    const steps = buildDemoWorkspaceSteps(
      "architecture",
      snapshot,
      "https://prumo.test/",
    );

    expect(steps.map((step) => step.id)).toEqual([
      "quote",
      "public_view",
      "pdf",
      "project",
      "briefing",
      "spaces",
      "deliverables",
      "finance",
    ]);
    expect(steps.find((step) => step.id === "briefing")?.href).toBe(
      "/app/obras/project-id#briefing",
    );
    expect(steps.find((step) => step.id === "pdf")?.href).toBe(
      "https://prumo.test/q/safe_token/pdf",
    );
  });

  it("keeps construction focused on execution", () => {
    const steps = buildDemoWorkspaceSteps(
      "construction",
      snapshot,
      "https://prumo.test",
    );

    expect(steps.map((step) => step.id)).not.toContain("briefing");
    expect(steps.map((step) => step.id)).not.toContain("spaces");
    expect(steps.find((step) => step.id === "quote")?.title).toBe(
      "Orçamento",
    );
  });

  it("returns unavailable links before the scenario is prepared", () => {
    const steps = buildDemoWorkspaceSteps(
      "interiors",
      null,
      "https://prumo.test",
    );
    expect(steps.every((step) => step.href === null)).toBe(true);
  });

  it("uses a specific scenario title for every segment", () => {
    expect(demoWorkspaceTitle("architecture")).toBe(
      "Projeto residencial completo",
    );
    expect(demoWorkspaceTitle("interiors")).toBe(
      "Projeto de interiores completo",
    );
    expect(demoWorkspaceTitle("engineering")).toBe(
      "Serviço técnico completo",
    );
    expect(demoWorkspaceTitle("construction")).toBe("Obra completa");
  });
});
