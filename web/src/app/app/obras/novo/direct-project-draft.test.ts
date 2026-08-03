import { describe, expect, it } from "vitest";
import {
  initialDirectProjectDraft,
  isDirectProjectDraftDirty,
  validateDirectProjectDraft,
} from "./direct-project-draft";

describe("direct project draft", () => {
  it("requires a new customer and project name in an empty workspace", () => {
    const draft = initialDirectProjectDraft("client_briefing", []);
    const validation = validateDirectProjectDraft(draft);

    expect(draft.customerMode).toBe("new");
    expect(validation.valid).toBe(false);
    expect(validation.firstField).toBe("customerName");
    expect(validation.errors.projectName).toBeTruthy();
  });

  it("accepts an existing customer and parses the budget", () => {
    const draft = initialDirectProjectDraft("existing_project", [
      { id: "customer-id" } as never,
    ]);
    draft.projectName = "Projeto residencial";
    draft.budget = "12.500,00";

    expect(validateDirectProjectDraft(draft)).toMatchObject({
      valid: true,
      budgetCents: 1_250_000,
    });
  });

  it("rejects invalid dates and optional customer data", () => {
    const draft = initialDirectProjectDraft("execution_control", []);
    draft.customerName = "Cliente";
    draft.customerEmail = "email-invalido";
    draft.customerState = "XX";
    draft.projectName = "Obra";
    draft.startsOn = "2026-08-10";
    draft.endsOn = "2026-08-01";

    const validation = validateDirectProjectDraft(draft);
    expect(validation.errors.customerEmail).toBeTruthy();
    expect(validation.errors.customerState).toBeTruthy();
    expect(validation.errors.endsOn).toBeTruthy();
  });

  it("detects meaningful changes without counting defaults", () => {
    const draft = initialDirectProjectDraft("existing_project", [
      { id: "customer-id" } as never,
    ]);
    expect(isDirectProjectDraftDirty(draft)).toBe(false);
    draft.projectName = "Projeto";
    expect(isDirectProjectDraftDirty(draft)).toBe(true);
  });
});
