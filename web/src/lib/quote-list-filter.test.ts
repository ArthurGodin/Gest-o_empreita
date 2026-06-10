import { describe, expect, it } from "vitest";
import {
  countQuotesByStatus,
  filterQuotes,
  parseQuoteListStatusFilter,
  type QuoteListFilterItem,
} from "./quote-list-filter";

const quotes = [
  quote("ORC-001", "Cobertura", "approved", "Maria Santos"),
  quote("ORC-002", "Reforma do banheiro", "rejected", "João Lima"),
  quote("ORC-003", "Pintura externa", "sent", "Ana Souza"),
  quote("ORC-004", "Calhas e rufos", "expired", "Maria Santos"),
] satisfies QuoteListFilterItem[];

describe("quote list filter", () => {
  it("filters by effective status", () => {
    expect(filterQuotes(quotes, { status: "approved", query: "" })).toEqual([
      quotes[0],
    ]);
    expect(filterQuotes(quotes, { status: "rejected", query: "" })).toEqual([
      quotes[1],
    ]);
  });

  it("combines status and text search", () => {
    expect(
      filterQuotes(quotes, { status: "all", query: "maria" }).map(
        (quote) => quote.number,
      ),
    ).toEqual(["ORC-001", "ORC-004"]);

    expect(
      filterQuotes(quotes, { status: "expired", query: "maria" }).map(
        (quote) => quote.number,
      ),
    ).toEqual(["ORC-004"]);
  });

  it("searches by number and title with PT-BR case folding", () => {
    expect(
      filterQuotes(quotes, { status: "all", query: "orc-003" }).map(
        (quote) => quote.title,
      ),
    ).toEqual(["Pintura externa"]);

    expect(
      filterQuotes(quotes, { status: "all", query: "banheiro" }).map(
        (quote) => quote.number,
      ),
    ).toEqual(["ORC-002"]);
  });

  it("counts all status chips from the unfiltered dataset", () => {
    expect(countQuotesByStatus(quotes)).toMatchObject({
      all: 4,
      approved: 1,
      rejected: 1,
      sent: 1,
      expired: 1,
      viewed: 0,
      draft: 0,
    });
  });

  it("sanitizes unknown status filters from the URL", () => {
    expect(parseQuoteListStatusFilter("approved")).toBe("approved");
    expect(parseQuoteListStatusFilter("anything")).toBe("all");
    expect(parseQuoteListStatusFilter(null)).toBe("all");
  });
});

function quote(
  number: string,
  title: string,
  effective_status: QuoteListFilterItem["effective_status"],
  customerName: string,
): QuoteListFilterItem {
  return {
    number,
    title,
    effective_status,
    customer: { name: customerName },
  };
}
