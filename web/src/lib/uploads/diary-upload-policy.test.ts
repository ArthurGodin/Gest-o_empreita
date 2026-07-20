import { describe, expect, it } from "vitest";
import {
  MAX_DIARY_PHOTO_BYTES,
  MAX_DIARY_UPLOAD_REQUEST_BYTES,
  validateDiaryPhotoMetadata,
  validateDiaryUploadContentLength,
} from "./diary-upload-policy";

describe("diary upload policy", () => {
  it("accepts a missing content length and valid request sizes", () => {
    expect(validateDiaryUploadContentLength(null)).toBeNull();
    expect(
      validateDiaryUploadContentLength(String(MAX_DIARY_UPLOAD_REQUEST_BYTES)),
    ).toBeNull();
  });

  it("rejects malformed and excessive request sizes", () => {
    expect(validateDiaryUploadContentLength("12mb")?.code).toBe(
      "invalid_content_length",
    );
    expect(
      validateDiaryUploadContentLength(
        String(MAX_DIARY_UPLOAD_REQUEST_BYTES + 1),
      )?.code,
    ).toBe("payload_too_large");
  });

  it("accepts supported or absent declared MIME types", () => {
    expect(
      validateDiaryPhotoMetadata({ size: 1, declaredMime: "image/jpeg" }),
    ).toBeNull();
    expect(
      validateDiaryPhotoMetadata({ size: 1, declaredMime: "" }),
    ).toBeNull();
  });

  it("rejects empty, oversized and unsupported files", () => {
    expect(
      validateDiaryPhotoMetadata({ size: 0, declaredMime: "image/jpeg" })
        ?.code,
    ).toBe("empty_file");
    expect(
      validateDiaryPhotoMetadata({
        size: MAX_DIARY_PHOTO_BYTES + 1,
        declaredMime: "image/jpeg",
      })?.code,
    ).toBe("file_too_large");
    expect(
      validateDiaryPhotoMetadata({ size: 10, declaredMime: "application/pdf" })
        ?.code,
    ).toBe("unsupported_declared_type");
  });
});
