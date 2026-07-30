export const MARKETING_CONSENT_COOKIE = "prumo_marketing_consent";
export const MARKETING_CONSENT_VERSION = 1;
export const MARKETING_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const MARKETING_CONSENT_CHANGED_EVENT =
  "prumo:marketing-consent-changed";

export type MarketingConsentState = "granted" | "denied";

export function parseMarketingConsent(
  value: string | null | undefined,
): MarketingConsentState | null {
  if (!value) return null;

  const match = /^v(\d+)\.(granted|denied)$/.exec(value.trim());
  if (!match || Number(match[1]) !== MARKETING_CONSENT_VERSION) return null;
  return match[2] as MarketingConsentState;
}

export function marketingConsentFromCookieHeader(
  cookieHeader: string | null | undefined,
): MarketingConsentState | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== MARKETING_CONSENT_COOKIE) continue;

    const rawValue = part.slice(separator + 1).trim();
    try {
      return parseMarketingConsent(decodeURIComponent(rawValue));
    } catch {
      return null;
    }
  }

  return null;
}

export function hasGrantedMarketingConsent(
  cookieHeader: string | null | undefined,
) {
  return marketingConsentFromCookieHeader(cookieHeader) === "granted";
}

export function shouldShowMarketingConsent({
  metaConfigured,
  cookieHeader,
}: {
  metaConfigured: boolean;
  cookieHeader: string | null | undefined;
}) {
  return (
    metaConfigured && marketingConsentFromCookieHeader(cookieHeader) === null
  );
}

export function serializeMarketingConsentCookie(
  state: MarketingConsentState,
  { secure }: { secure: boolean },
) {
  const value = `v${MARKETING_CONSENT_VERSION}.${state}`;
  return [
    `${MARKETING_CONSENT_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${MARKETING_CONSENT_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}
