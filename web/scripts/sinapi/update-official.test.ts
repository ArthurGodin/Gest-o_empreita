import { describe, expect, it } from "vitest";
import { candidateCompetences, hasImportCapacity } from "./update-official";

describe("official SINAPI updater", () => {
  it("checks the newest official months across year boundaries", () => {
    expect(candidateCompetences(new Date("2026-01-20T12:00:00Z"))).toEqual([
      "2026-01", "2025-12", "2025-11", "2025-10",
    ]);
  });

  it("stops before exhausting the Free database", () => {
    expect(hasImportCapacity(88 * 1024 * 1024, 46_269)).toBe(true);
    expect(hasImportCapacity(300 * 1024 * 1024, 46_269)).toBe(false);
    expect(hasImportCapacity(Number.NaN, 46_269)).toBe(false);
  });
});
