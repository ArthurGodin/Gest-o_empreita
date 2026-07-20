import { describe, expect, it } from "vitest";
import {
  HELP_TOPICS,
  findHelpTopic,
  isHelpCategoryId,
  normalizeHelpSearch,
  searchHelpTopics,
} from "./help-center";

describe("help center domain", () => {
  it("normalizes accents, case and repeated spaces", () => {
    expect(normalizeHelpSearch("  ORÇAMENTO   e Pix  ")).toBe(
      "orcamento e pix",
    );
  });

  it.each([
    ["Pix", "cobrar-entrada-e-saldo"],
    ["orcamento", "criar-orcamento"],
    ["SINAPI", "usar-sinapi"],
    ["cancelar", "cancelar-assinatura"],
  ])("finds %s by editorial content", (query, expectedTopic) => {
    expect(searchHelpTopics(query).map((topic) => topic.id)).toContain(
      expectedTopic,
    );
  });

  it("filters by category without changing editorial order", () => {
    const billing = searchHelpTopics("", "billing");

    expect(billing.map((topic) => topic.id)).toEqual([
      "cobrar-entrada-e-saldo",
      "pix-manual-ou-asaas",
    ]);
  });

  it("requires every term and returns an empty list when nothing matches", () => {
    expect(searchHelpTopics("pix asaas").map((topic) => topic.id)).toContain(
      "pix-manual-ou-asaas",
    );
    expect(searchHelpTopics("recurso inexistente espacial")).toEqual([]);
  });

  it("returns every topic for an empty query and all categories", () => {
    expect(searchHelpTopics("")).toHaveLength(HELP_TOPICS.length);
  });

  it("rejects unknown topics and categories", () => {
    expect(findHelpTopic("usar-sinapi")?.category).toBe("quotes");
    expect(findHelpTopic("unknown-topic")).toBeNull();
    expect(isHelpCategoryId("billing")).toBe(true);
    expect(isHelpCategoryId("unknown-category")).toBe(false);
  });
});
