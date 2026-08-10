import { describe, expect, it } from "vitest";
import {
  acquisitionContextFromSearchParams,
  buildAcquisitionHref,
  normalizeAcquisitionBusinessSegment,
  parseAcquisitionContext,
} from "./acquisition-context";

describe("acquisition context", () => {
  it.each([
    "architecture",
    "interiors",
    "engineering",
    "construction",
  ] as const)("accepts the supported profile %s", (businessSegment) => {
    expect(normalizeAcquisitionBusinessSegment(businessSegment)).toBe(
      businessSegment,
    );
  });

  it.each([undefined, null, "", "student", ["architecture"]])(
    "rejects an absent, unknown, or repeated profile",
    (value) => {
      expect(normalizeAcquisitionBusinessSegment(value)).toBeNull();
    },
  );

  it("parses only supported profile and paid plan values", () => {
    expect(
      parseAcquisitionContext({
        perfil: "interiors",
        plan: "ultimate",
      }),
    ).toEqual({ businessSegment: "interiors", plan: "ultimate" });

    expect(
      parseAcquisitionContext({ perfil: "unknown", plan: "free" }),
    ).toEqual({ businessSegment: null, plan: null });
  });

  it("rejects duplicated search parameters", () => {
    const values = new Map<string, string[]>([
      ["perfil", ["architecture", "construction"]],
      ["plan", ["pro"]],
    ]);

    expect(
      acquisitionContextFromSearchParams({
        getAll: (name) => values.get(name) ?? [],
      }),
    ).toEqual({ businessSegment: null, plan: "pro" });
  });

  it("builds stable links while omitting invalid values", () => {
    expect(
      buildAcquisitionHref("/signup", {
        businessSegment: "architecture",
      }),
    ).toBe("/signup?perfil=architecture");

    expect(
      buildAcquisitionHref("/signup", {
        businessSegment: "engineering",
        plan: "pro",
      }),
    ).toBe("/signup?plan=pro&perfil=engineering");

    expect(
      buildAcquisitionHref("/signup", {
        businessSegment: "unknown",
        plan: "free",
      }),
    ).toBe("/signup");
  });

  it("keeps required leading parameters encoded", () => {
    expect(
      buildAcquisitionHref(
        "/onboarding",
        { businessSegment: "interiors", plan: "ultimate" },
        [["signup_event_id", "event with spaces"]],
      ),
    ).toBe(
      "/onboarding?signup_event_id=event+with+spaces&plan=ultimate&perfil=interiors",
    );
  });
});
