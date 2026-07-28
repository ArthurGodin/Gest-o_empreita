import { describe, expect, it } from "vitest";
import { formatDateBR, formatDateTimeBR } from "./utils";

describe("utils", () => {
  it("formats date-only strings without UTC day drift", () => {
    expect(formatDateBR("2026-05-31")).toBe("31/05/2026");
  });

  it("formats timestamps deterministically in Sao Paulo time", () => {
    const timestamp = "2026-07-28T19:56:00.000Z";

    expect(formatDateBR(timestamp)).toBe("28/07/2026");
    expect(formatDateTimeBR(timestamp)).toBe("28/07/2026, 16:56");
    expect(
      formatDateTimeBR(timestamp, {
        dateStyle: "long",
        timeStyle: "short",
      }),
    ).toBe("28 de julho de 2026 às 16:56");
  });

  it("keeps timestamps near UTC midnight on the Brazilian calendar day", () => {
    expect(formatDateBR("2026-06-01T01:00:00.000Z")).toBe("31/05/2026");
  });
});
