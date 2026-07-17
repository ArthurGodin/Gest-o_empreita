import { describe, expect, it } from "vitest";
import {
  formDraftChanged,
  formDraftSignature,
  formatSavedTime,
} from "./form-draft";

describe("form draft helpers", () => {
  it("creates the same signature for the same normalized value", () => {
    const draft = { name: "Prumo", state: "PI", notes: "" };

    expect(formDraftSignature(draft)).toBe(formDraftSignature({ ...draft }));
  });

  it("detects a persistible change against the saved signature", () => {
    const saved = formDraftSignature({ name: "Prumo", state: "PI" });

    expect(formDraftChanged({ name: "Prumo", state: "PI" }, saved)).toBe(false);
    expect(formDraftChanged({ name: "Prumo", state: "MA" }, saved)).toBe(true);
  });

  it("formats a confirmed save time for the Brazilian locale", () => {
    const date = new Date(2026, 6, 17, 9, 7, 0);

    expect(formatSavedTime(date)).toBe("09:07");
    expect(formatSavedTime(null)).toBeNull();
  });
});
