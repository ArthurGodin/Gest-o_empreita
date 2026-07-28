import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

import { resizePhoto, sniffImageMime } from "./resize";

describe("photo resize pipeline", () => {
  it("processes an oversized image with the production sharp version", async () => {
    const input = await sharp({
      create: {
        width: 1600,
        height: 800,
        channels: 3,
        background: { r: 20, g: 130, b: 90 },
      },
    })
      .png()
      .toBuffer();

    expect(sniffImageMime(input)).toBe("image/png");

    const result = await resizePhoto(input);

    expect(result).not.toBeNull();
    expect(result?.width).toBe(1200);
    expect(result?.height).toBe(600);
    expect(result?.size_bytes).toBe(result?.buffer.byteLength);
    expect(sniffImageMime(result?.buffer ?? Buffer.alloc(0))).toBe(
      "image/jpeg",
    );
  });

  it("rejects data that is not a decodable image", async () => {
    const input = Buffer.from("not-an-image");

    expect(sniffImageMime(input)).toBeNull();
    await expect(resizePhoto(input)).resolves.toBeNull();
  });
});
