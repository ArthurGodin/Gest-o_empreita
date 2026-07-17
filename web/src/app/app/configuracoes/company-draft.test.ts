import { describe, expect, it } from "vitest";
import {
  companyDraftSignature,
  normalizedCompanyDraft,
  validateCompanyDraft,
  type CompanyDraft,
} from "./company-draft";

function draft(overrides: Partial<CompanyDraft> = {}): CompanyDraft {
  return {
    name: "Prumo Engenharia",
    legal_name: "",
    cnpj: "",
    phone: "",
    email: "",
    address: "",
    city: "Teresina",
    state: "PI",
    zip_code: "",
    ...overrides,
  };
}

describe("company draft", () => {
  it("normalizes text and UF before persistence", () => {
    expect(
      normalizedCompanyDraft(
        draft({ name: " Prumo Engenharia ", state: " pi " }),
      ),
    ).toMatchObject({ name: "Prumo Engenharia", state: "PI" });
  });

  it("ignores formatting that the server also normalizes", () => {
    expect(
      companyDraftSignature(draft({ name: " Prumo Engenharia ", state: "pi" })),
    ).toBe(companyDraftSignature(draft()));
  });

  it("returns the first invalid field in visual order", () => {
    const validation = validateCompanyDraft(
      draft({ name: " ", email: "invalido", state: "PIA" }),
    );

    expect(validation.valid).toBe(false);
    expect(validation.firstField).toBe("name");
    expect(validation.errors).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      state: expect.any(String),
    });
  });
});
