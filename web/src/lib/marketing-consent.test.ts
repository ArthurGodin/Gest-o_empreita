import { describe, expect, it } from "vitest";
import {
  MARKETING_CONSENT_COOKIE,
  MARKETING_CONSENT_MAX_AGE_SECONDS,
  hasGrantedMarketingConsent,
  marketingConsentFromCookieHeader,
  parseMarketingConsent,
  serializeMarketingConsentCookie,
  shouldShowMarketingConsent,
} from "./marketing-consent";

describe("marketing consent", () => {
  it.each([
    ["v1.granted", "granted"],
    ["v1.denied", "denied"],
    ["v2.granted", null],
    ["granted", null],
    ["", null],
  ] as const)("parses versioned value %s", (value, expected) => {
    expect(parseMarketingConsent(value)).toBe(expected);
  });

  it("reads only the named cookie and tolerates malformed values", () => {
    expect(
      marketingConsentFromCookieHeader(
        `session=abc; ${MARKETING_CONSENT_COOKIE}=v1.granted; theme=light`,
      ),
    ).toBe("granted");
    expect(
      marketingConsentFromCookieHeader(
        `${MARKETING_CONSENT_COOKIE}=%E0%A4%A`,
      ),
    ).toBeNull();
  });

  it("gates measurement on explicit granted consent", () => {
    expect(
      hasGrantedMarketingConsent(
        `${MARKETING_CONSENT_COOKIE}=v1.granted`,
      ),
    ).toBe(true);
    expect(
      hasGrantedMarketingConsent(`${MARKETING_CONSENT_COOKIE}=v1.denied`),
    ).toBe(false);
    expect(hasGrantedMarketingConsent(null)).toBe(false);
  });

  it("shows the choice only when Meta is configured and no current choice exists", () => {
    expect(
      shouldShowMarketingConsent({
        metaConfigured: true,
        cookieHeader: "",
      }),
    ).toBe(true);
    expect(
      shouldShowMarketingConsent({
        metaConfigured: true,
        cookieHeader: `${MARKETING_CONSENT_COOKIE}=v1.denied`,
      }),
    ).toBe(false);
    expect(
      shouldShowMarketingConsent({
        metaConfigured: false,
        cookieHeader: "",
      }),
    ).toBe(false);
  });

  it("serializes a 180-day Lax cookie with environment-aware transport", () => {
    const production = serializeMarketingConsentCookie("granted", {
      secure: true,
    });
    const local = serializeMarketingConsentCookie("denied", {
      secure: false,
    });

    expect(production).toContain(
      `${MARKETING_CONSENT_COOKIE}=v1.granted`,
    );
    expect(production).toContain(
      `Max-Age=${MARKETING_CONSENT_MAX_AGE_SECONDS}`,
    );
    expect(production).toContain("SameSite=Lax");
    expect(production).toContain("Secure");
    expect(local).not.toContain("Secure");
  });
});
