export const MAX_DIARY_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_DIARY_UPLOAD_REQUEST_BYTES = 12 * 1024 * 1024;

const ALLOWED_DECLARED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type DiaryUploadPolicyViolation = {
  code:
    | "invalid_content_length"
    | "payload_too_large"
    | "empty_file"
    | "file_too_large"
    | "unsupported_declared_type";
  status: 400 | 413 | 415;
  message: string;
};

export function validateDiaryUploadContentLength(
  value: string | null,
): DiaryUploadPolicyViolation | null {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) {
    return {
      code: "invalid_content_length",
      status: 400,
      message: "Tamanho da requisição inválido.",
    };
  }

  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes)) {
    return {
      code: "invalid_content_length",
      status: 400,
      message: "Tamanho da requisição inválido.",
    };
  }
  if (bytes > MAX_DIARY_UPLOAD_REQUEST_BYTES) {
    return {
      code: "payload_too_large",
      status: 413,
      message: "Envio muito grande. Use uma foto de até 10 MB.",
    };
  }
  return null;
}

export function validateDiaryPhotoMetadata(input: {
  size: number;
  declaredMime: string;
}): DiaryUploadPolicyViolation | null {
  if (!Number.isSafeInteger(input.size) || input.size <= 0) {
    return {
      code: "empty_file",
      status: 400,
      message: "Arquivo vazio.",
    };
  }
  if (input.size > MAX_DIARY_PHOTO_BYTES) {
    return {
      code: "file_too_large",
      status: 413,
      message: "Foto muito grande. Use uma imagem de até 10 MB.",
    };
  }

  const declaredMime = input.declaredMime.trim().toLowerCase();
  if (declaredMime && !ALLOWED_DECLARED_MIME_TYPES.has(declaredMime)) {
    return {
      code: "unsupported_declared_type",
      status: 415,
      message: "Formato não suportado. Use JPG, PNG ou WebP.",
    };
  }
  return null;
}
