import { timingSafeEqual } from "crypto";

export function timingSafeTokenMatches(
  received: string | null,
  expected: string | null | undefined,
): boolean {
  if (!expected || !received) return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
