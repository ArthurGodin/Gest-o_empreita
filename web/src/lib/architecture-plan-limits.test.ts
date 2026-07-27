import { describe, expect, it } from "vitest";
import {
  architectureLimitMessage,
  getArchitecturePlanLimits,
} from "./architecture-plan-limits";

describe("architecture plan limits", () => {
  it("keeps the free experience complete but constrained", () => {
    expect(getArchitecturePlanLimits("free")).toEqual({
      activeBriefingsPerCompany: 1,
      revisionsPerBriefing: 1,
      activeSpacesPerProject: 3,
    });
  });

  it("uses explicit increasing technical limits", () => {
    const free = getArchitecturePlanLimits("free");
    const pro = getArchitecturePlanLimits("pro");
    const ultimate = getArchitecturePlanLimits("ultimate");

    expect(pro.activeBriefingsPerCompany).toBeGreaterThan(
      free.activeBriefingsPerCompany,
    );
    expect(ultimate.activeBriefingsPerCompany).toBeGreaterThan(
      pro.activeBriefingsPerCompany,
    );
    expect(pro.revisionsPerBriefing).toBeGreaterThan(free.revisionsPerBriefing);
    expect(ultimate.activeSpacesPerProject).toBeGreaterThan(
      pro.activeSpacesPerProject,
    );
  });

  it("explains that existing data remains available", () => {
    expect(architectureLimitMessage("briefings", "free")).toContain(
      "continuam disponíveis",
    );
    expect(architectureLimitMessage("spaces", "free")).toContain(
      "continuam disponíveis",
    );
    expect(architectureLimitMessage("revisions", "free")).toContain(
      "Assine o Pro",
    );
  });
});
