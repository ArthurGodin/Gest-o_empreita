import { describe, expect, it } from "vitest";
import {
  parseBRLToCents,
  validateCostDraft,
  validateStageDraft,
  validateTimeDraft,
} from "./project-command-draft";

describe("project command drafts", () => {
  it("parses Brazilian currency without floating point leakage", () => {
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("10,90")).toBe(1090);
    expect(parseBRLToCents("1234.56")).toBe(123456);
    expect(parseBRLToCents("1.234")).toBe(123400);
    expect(parseBRLToCents("-1")).toBeNull();
  });

  it("validates stage name and estimated days", () => {
    expect(validateStageDraft({ name: "", days: "0" })).toEqual({
      name: "Informe o nome da etapa.",
      days: "Informe de 1 a 365 dias.",
    });
  });

  it("validates cost amount and date", () => {
    expect(
      validateCostDraft({
        category: "material",
        description: "Telhas",
        amount: "0",
        incurredOn: "17/07/2026",
        stageId: "__none__",
      }),
    ).toEqual({
      amount: "Informe um valor maior que zero.",
      incurredOn: "Informe uma data válida.",
    });
  });

  it("requires the essential time entry fields", () => {
    const errors = validateTimeDraft({
      workerName: "",
      workerRole: "pedreiro",
      startedAt: "25:00",
      endedAt: "",
      workedOn: "2026-07-17",
      notes: "",
    });

    expect(errors.workerName).toBe("Informe o nome do profissional.");
    expect(errors.startedAt).toBe("Informe uma hora de entrada válida.");
  });
});
