import { describe, expect, it } from "vitest";
import {
  buildProjectWorkspaceHref,
  getProjectWorkspaceViews,
  isProjectWorkspaceViewAvailable,
  resolveLegacyProjectWorkspaceHash,
  resolveProjectWorkspaceView,
} from "./project-workspace";

describe("project workspace", () => {
  it("exposes professional areas only for architecture and interiors", () => {
    expect(
      getProjectWorkspaceViews("architecture").map((view) => view.id),
    ).toEqual([
      "resumo",
      "briefing",
      "ambientes",
      "etapas",
      "entregas",
      "gestao",
    ]);
    expect(getProjectWorkspaceViews("interiors")).toEqual(
      getProjectWorkspaceViews("architecture"),
    );
    expect(getProjectWorkspaceViews("engineering").map((view) => view.id)).toEqual([
      "resumo",
      "etapas",
      "entregas",
      "gestao",
    ]);
    expect(getProjectWorkspaceViews("construction")).toEqual(
      getProjectWorkspaceViews("engineering"),
    );
  });

  it("resolves an explicit area only when it is available", () => {
    expect(
      resolveProjectWorkspaceView({
        value: "briefing",
        segment: "architecture",
      }),
    ).toBe("briefing");
    expect(
      resolveProjectWorkspaceView({
        value: "briefing",
        segment: "engineering",
      }),
    ).toBe("resumo");
    expect(
      resolveProjectWorkspaceView({
        value: "unknown",
        segment: "construction",
      }),
    ).toBe("resumo");
  });

  it("opens management for billing attention only without an explicit area", () => {
    expect(
      resolveProjectWorkspaceView({
        value: undefined,
        segment: "construction",
        billingAttention: true,
      }),
    ).toBe("gestao");
    expect(
      resolveProjectWorkspaceView({
        value: "etapas",
        segment: "construction",
        billingAttention: true,
      }),
    ).toBe("etapas");
  });

  it("maps legacy hashes and rejects unavailable professional areas", () => {
    expect(
      resolveLegacyProjectWorkspaceHash("#briefing", "architecture"),
    ).toEqual({ view: "briefing" });
    expect(
      resolveLegacyProjectWorkspaceHash("#cobranca", "construction"),
    ).toEqual({ view: "gestao", hash: "cobranca" });
    expect(resolveLegacyProjectWorkspaceHash("#briefing", "engineering")).toBeNull();
    expect(resolveLegacyProjectWorkspaceHash("#unknown", "architecture")).toBeNull();
  });

  it("detects view availability by segment", () => {
    expect(isProjectWorkspaceViewAvailable("ambientes", "interiors")).toBe(true);
    expect(isProjectWorkspaceViewAvailable("ambientes", "construction")).toBe(
      false,
    );
    expect(isProjectWorkspaceViewAvailable(null, "architecture")).toBe(false);
  });

  it("builds a deep link without dropping compatible parameters", () => {
    expect(
      buildProjectWorkspaceHref({
        pathname: "/app/obras/project-1",
        currentSearch: "?source=demo&cobranca=atencao",
        view: "gestao",
        hash: "diario",
      }),
    ).toBe(
      "/app/obras/project-1?source=demo&cobranca=atencao&view=gestao#diario",
    );
  });

  it("removes stale billing attention outside management", () => {
    expect(
      buildProjectWorkspaceHref({
        pathname: "/app/obras/project-1",
        currentSearch: "cobranca=atencao&source=dashboard",
        view: "etapas",
      }),
    ).toBe("/app/obras/project-1?source=dashboard&view=etapas");
  });
});
