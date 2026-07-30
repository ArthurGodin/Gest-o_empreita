import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackProductEvent } from "./product-analytics";

const mocks = vi.hoisted(() => ({
  metaEventForProductEvent: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: mocks.track,
}));
vi.mock("@/lib/meta-events", () => ({
  metaEventForProductEvent: mocks.metaEventForProductEvent,
}));

describe("product analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.metaEventForProductEvent.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps compact product events in Vercel Analytics", () => {
    trackProductEvent("quote_created", {
      source: "manual",
      count: 1,
      omitted: undefined,
    });

    expect(mocks.track).toHaveBeenCalledWith("quote_created", {
      source: "manual",
      count: 1,
    });
  });

  it("does not call an internal ingestion API for error boundaries", () => {
    const fetchMock = vi.fn();
    const beaconMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { sendBeacon: beaconMock });

    trackProductEvent("global_error_boundary", {
      digest: "controlled-digest",
    });

    expect(mocks.track).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(beaconMock).not.toHaveBeenCalled();
  });

  it("keeps Pixel delivery as best effort when fbq is available", () => {
    const fbq = vi.fn();
    vi.stubGlobal("window", { fbq });
    mocks.metaEventForProductEvent.mockReturnValue({
      eventName: "Lead",
      customData: { funnel_step: "signup_submit" },
    });

    trackProductEvent("signup_form_submitted");

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Lead",
      { funnel_step: "signup_submit" },
      {
        eventID: expect.stringMatching(/^signup_form_submitted-/),
      },
    );
  });
});
