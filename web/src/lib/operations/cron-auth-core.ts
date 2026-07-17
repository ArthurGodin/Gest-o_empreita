import { createHash, timingSafeEqual } from "node:crypto";

export function timingSafeCronSecretMatches(
  authorizationHeader: string | null,
  configuredSecret: string | null | undefined,
) {
  if (!configuredSecret || configuredSecret.length < 32) return false;
  if (!authorizationHeader?.startsWith("Bearer ")) return false;

  const received = authorizationHeader.slice("Bearer ".length);
  if (!received || /\s/.test(received)) return false;

  const expectedDigest = createHash("sha256").update(configuredSecret).digest();
  const receivedDigest = createHash("sha256").update(received).digest();
  return timingSafeEqual(expectedDigest, receivedDigest);
}
