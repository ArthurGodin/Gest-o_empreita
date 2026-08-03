import { describe, expect, it } from "vitest";
import { canUseTopographyAnimation } from "./topography-capability";

const capableDesktop = {
  viewportWidth: 1440,
  hasWebGl2: true,
  prefersReducedMotion: false,
  saveData: false,
  effectiveConnectionType: "4g",
  hardwareConcurrency: 8,
  deviceMemoryGb: 8,
} as const;

describe("topography animation capability", () => {
  it("allows a capable desktop", () => {
    expect(canUseTopographyAnimation(capableDesktop)).toBe(true);
  });

  it.each([
    ["mobile viewport", { viewportWidth: 1023 }],
    ["missing WebGL2", { hasWebGl2: false }],
    ["reduced motion", { prefersReducedMotion: true }],
    ["data saver", { saveData: true }],
    ["slow connection", { effectiveConnectionType: "2g" }],
    ["low core count", { hardwareConcurrency: 2 }],
    ["low memory", { deviceMemoryGb: 2 }],
  ])("blocks %s", (_label, override) => {
    expect(
      canUseTopographyAnimation({ ...capableDesktop, ...override }),
    ).toBe(false);
  });

  it("allows browsers that do not expose optional hardware hints", () => {
    expect(
      canUseTopographyAnimation({
        viewportWidth: 1024,
        hasWebGl2: true,
        prefersReducedMotion: false,
        saveData: false,
      }),
    ).toBe(true);
  });
});
