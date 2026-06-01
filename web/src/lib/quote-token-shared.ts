const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,}$/;

export function isShareTokenUrlSafe(
  token: string | null | undefined,
): token is string {
  return typeof token === "string" && SHARE_TOKEN_PATTERN.test(token);
}

/**
 * Constant-time comparison to avoid timing attacks in anonymous quote routes.
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
