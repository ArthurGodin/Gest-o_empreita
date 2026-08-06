import { describe, expect, it } from "vitest";
import { shouldShowLandingIntro } from "./landing-intro-core";

describe("shouldShowLandingIntro", () => {
  it("shows the intro on the first capable visit", () => {
    expect(
      shouldShowLandingIntro({
        hasBeenSeen: false,
        prefersReducedMotion: false,
        saveData: false,
      }),
    ).toBe(true);
  });

  it.each([
    ["a previous view in the session", { hasBeenSeen: true }],
    ["reduced motion", { prefersReducedMotion: true }],
    ["data saver", { saveData: true }],
  ])("skips the intro for %s", (_reason, override) => {
    expect(
      shouldShowLandingIntro({
        hasBeenSeen: false,
        prefersReducedMotion: false,
        saveData: false,
        ...override,
      }),
    ).toBe(false);
  });
});
