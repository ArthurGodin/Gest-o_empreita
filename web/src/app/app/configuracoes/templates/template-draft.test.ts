import { describe, expect, it } from "vitest";
import {
  initialTemplateDraft,
  templateDraftPayload,
  templateDraftSignature,
  validateTemplateDraft,
} from "./template-draft";

describe("template draft", () => {
  it("keeps UI keys out of the persistence signature", () => {
    const first = initialTemplateDraft("Cobertura", "", [
      { name: "Montagem", est_days: 3 },
    ]);
    const second = {
      ...first,
      items: [{ ...first.items[0]!, key: "another-key" }],
    };

    expect(templateDraftSignature(first)).toBe(templateDraftSignature(second));
  });

  it("points to the first invalid visible item", () => {
    const draft = initialTemplateDraft("Reforma", "", [
      { name: "", est_days: 0 },
    ]);
    draft.items[0]!.estDays = "0";

    const result = validateTemplateDraft(draft);

    expect(result.ok).toBe(false);
    expect(result.firstFieldId).toBe("template-item-name-initial-0");
    expect(result.errors.items?.["initial-0"]).toEqual({
      name: "Informe o nome da etapa.",
      estDays: "Informe de 1 a 365 dias.",
    });
  });

  it("normalizes a valid payload for the server action", () => {
    const draft = initialTemplateDraft("  Cobertura  ", "  Modelo base  ", [
      { name: "  Estrutura  ", est_days: 5 },
    ]);

    expect(validateTemplateDraft(draft).ok).toBe(true);
    expect(templateDraftPayload(draft)).toEqual({
      name: "Cobertura",
      description: "Modelo base",
      items: [{ name: "Estrutura", est_days: 5 }],
    });
  });
});
