import { describe, expect, it } from "vitest";
import {
  customerDraftFormData,
  customerDraftSignature,
  initialCustomerDraft,
  normalizedCustomerDraft,
  validateCustomerDraft,
} from "./customer-draft";

describe("customer draft", () => {
  it("normalizes persisted fields before creating the signature", () => {
    const draft = {
      ...initialCustomerDraft(),
      name: "  Maria Silva  ",
      document: "529.982.247-25",
      state: " pi ",
      notes: "  Cliente recorrente  ",
    };

    expect(normalizedCustomerDraft(draft)).toMatchObject({
      name: "Maria Silva",
      document: "52998224725",
      state: "PI",
      notes: "Cliente recorrente",
    });
  });

  it("does not mark irrelevant formatting as a real change", () => {
    const base = {
      ...initialCustomerDraft(),
      name: "Maria Silva",
      document: "52998224725",
      state: "PI",
    };
    const formatted = {
      ...base,
      name: " Maria Silva ",
      document: "529.982.247-25",
      state: "pi",
    };

    expect(customerDraftSignature(formatted)).toBe(
      customerDraftSignature(base),
    );
  });

  it("validates required and formatted fields in visual order", () => {
    const validation = validateCustomerDraft({
      ...initialCustomerDraft(),
      name: " ",
      document: "111.111.111-11",
      email: "email-invalido",
      state: "PIA",
    });

    expect(validation.valid).toBe(false);
    expect(validation.firstField).toBe("name");
    expect(validation.errors).toMatchObject({
      name: expect.any(String),
      document: expect.any(String),
      email: expect.any(String),
      state: expect.any(String),
    });
  });

  it("builds the FormData expected by the existing server action", () => {
    const data = customerDraftFormData({
      ...initialCustomerDraft(),
      name: "  Maria Silva ",
      state: "pi",
    });

    expect(data.get("name")).toBe("Maria Silva");
    expect(data.get("state")).toBe("PI");
    expect(data.get("notes")).toBe("");
  });
});
