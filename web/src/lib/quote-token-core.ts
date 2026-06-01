import { randomBytes } from "node:crypto";
export { isShareTokenUrlSafe, tokensMatch } from "./quote-token-shared";

/**
 * Generates a cryptographically strong token that is safe as a single URL path
 * segment. 32 bytes in base64url yields 43 chars and 256 bits of entropy.
 */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}
