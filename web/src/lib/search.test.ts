import { describe, expect, it } from "vitest";
import { normalizeSearch } from "./search";

describe("normalizeSearch", () => {
  it("normalizes case, whitespace and accents", () => {
    expect(normalizeSearch("  Jo\u00e3o da Silva  ")).toBe("joao da silva");
    expect(normalizeSearch("JOAO DA SILVA")).toBe("joao da silva");
  });

  it("normalizes composed Portuguese characters", () => {
    expect(normalizeSearch("Or\u00e7amento e execu\u00e7\u00e3o")).toBe(
      "orcamento e execucao",
    );
  });
});
