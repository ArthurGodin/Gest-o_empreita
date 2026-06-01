import { describe, expect, it } from "vitest";
import { formatDateBR } from "./utils";

describe("utils", () => {
  it("formats date-only strings without UTC day drift", () => {
    expect(formatDateBR("2026-05-31")).toBe("31/05/2026");
  });
});
