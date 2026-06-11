import { describe, expect, it } from "vitest";
import { rankCatalogSuggestions } from "@/lib/catalog-ranking";

interface CatalogItem {
  id: string;
  description: string;
}

function item(id: string, description: string): CatalogItem {
  return {
    id,
    description,
  };
}

describe("rankCatalogSuggestions", () => {
  it("prioritizes prefix matches, removes duplicates and respects the limit", () => {
    const telha = item("1", "Telha ceramica");
    const pintura = item("2", "Pintura de telha");
    const troca = item("3", "Troca de telha");

    expect(
      rankCatalogSuggestions(
        [telha],
        [pintura, telha, troca],
        2,
      ).map((suggestion) => suggestion.description),
    ).toEqual(["Telha ceramica", "Pintura de telha"]);
  });
});
