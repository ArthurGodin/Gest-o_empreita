import { describe, expect, it } from "vitest";
import {
  activationGoalStartHref,
  getActivationGoalOptions,
  isActivationGoalAllowed,
  normalizeActivationGoal,
} from "./activation-goals";

describe("activation goals", () => {
  it.each([
    ["architecture", ["sell", "existing_project", "client_briefing"]],
    ["interiors", ["sell", "existing_project", "client_briefing"]],
    ["engineering", ["sell", "existing_project", "deliverables"]],
    ["construction", ["sell", "existing_project", "execution_control"]],
  ] as const)("returns three contextual goals for %s", (segment, expected) => {
    expect(
      getActivationGoalOptions(segment).map((option) => option.value),
    ).toEqual(expected);
  });

  it("falls back to the commercial path for old or incompatible values", () => {
    expect(normalizeActivationGoal(null, "architecture")).toBe("sell");
    expect(normalizeActivationGoal("client_briefing", "engineering")).toBe(
      "sell",
    );
    expect(normalizeActivationGoal("execution_control", "construction")).toBe(
      "execution_control",
    );
  });

  it("validates a goal against the selected segment", () => {
    expect(isActivationGoalAllowed("client_briefing", "interiors")).toBe(true);
    expect(isActivationGoalAllowed("client_briefing", "construction")).toBe(
      false,
    );
  });

  it("builds the first useful destination", () => {
    expect(activationGoalStartHref("sell")).toBe(
      "/app/clientes/novo?after=quote",
    );
    expect(activationGoalStartHref("deliverables")).toBe(
      "/app/obras/novo?goal=deliverables",
    );
  });
});

