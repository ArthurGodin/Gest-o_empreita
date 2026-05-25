import "server-only";
import sharp from "sharp";

export interface ResizedPhoto {
  buffer: Buffer;
  width: number;
  height: number;
  size_bytes: number;
}

const MAX_DIM = 1200;
const JPEG_QUALITY = 82;

/**
 * Recebe buffer de imagem arbitrária (JPEG/PNG/WebP) e retorna JPEG
 * com maior lado = 1200px, q=82, EXIF strippada.
 *
 * Bloqueios:
 * - limitInputPixels 24MP (defesa contra "pixel bomb")
 * - failOn 'error' (rejeita imagem corrompida)
 *
 * Retorna null se o input não é imagem decodificável.
 */
export async function resizePhoto(
  input: Buffer,
): Promise<ResizedPhoto | null> {
  try {
    const pipeline = sharp(input, {
      limitInputPixels: 24_000_000,
      failOn: "error",
    });

    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height) return null;

    const needsResize =
      metadata.width > MAX_DIM || metadata.height > MAX_DIM;

    const transformed = pipeline.rotate(); // auto-orienta com base no EXIF antes de stripar

    const resized = needsResize
      ? transformed.resize(MAX_DIM, MAX_DIM, {
          fit: "inside",
          withoutEnlargement: true,
        })
      : transformed;

    const { data, info } = await resized
      .jpeg({
        quality: JPEG_QUALITY,
        progressive: true,
        mozjpeg: true,
      })
      .withMetadata({}) // remove EXIF/ICC (passa objeto vazio = sem nenhum metadado)
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      width: info.width,
      height: info.height,
      size_bytes: data.byteLength,
    };
  } catch {
    return null;
  }
}

/**
 * Verifica magic bytes pra confirmar que o buffer é JPEG/PNG/WebP.
 * Defense-in-depth — não confiar no Content-Type do client.
 */
export function sniffImageMime(
  buffer: Buffer,
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
