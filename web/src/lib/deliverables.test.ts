import { describe, expect, it } from "vitest";
import {
  DELIVERABLE_MAX_FILE_BYTES,
  deriveDeliverableDisplayState,
  formatStorageBytes,
  getDeliverablePlanLimits,
  hasBlockingDeliverableReviews,
  validateDeliverableExternalUrl,
  validateDeliverableFile,
} from "./deliverables";

describe("deliverables domain", () => {
  it("keeps plan limits explicit and increasing", () => {
    const free = getDeliverablePlanLimits("free");
    const pro = getDeliverablePlanLimits("pro");
    const ultimate = getDeliverablePlanLimits("ultimate");

    expect(free.activePerProject).toBe(3);
    expect(free.storageBytes).toBe(25 * 1024 * 1024);
    expect(pro.activePerProject).toBeGreaterThan(free.activePerProject);
    expect(pro.storageBytes).toBe(1024 * 1024 * 1024);
    expect(ultimate.activePerProject).toBeGreaterThan(pro.activePerProject);
    expect(ultimate.storageBytes).toBe(5 * 1024 * 1024 * 1024);
  });

  it("derives the visible state from the current published review", () => {
    expect(
      deriveDeliverableDisplayState({
        archivedAt: null,
        currentPublishedVersion: null,
      }),
    ).toBe("draft");
    expect(
      deriveDeliverableDisplayState({
        archivedAt: null,
        currentPublishedVersion: { reviewAction: null },
      }),
    ).toBe("waiting_review");
    expect(
      deriveDeliverableDisplayState({
        archivedAt: null,
        currentPublishedVersion: {
          reviewAction: "changes_requested",
        },
      }),
    ).toBe("changes_requested");
    expect(
      deriveDeliverableDisplayState({
        archivedAt: null,
        currentPublishedVersion: { reviewAction: "approved" },
      }),
    ).toBe("approved");
    expect(
      deriveDeliverableDisplayState({
        archivedAt: "2026-07-23T10:00:00Z",
        currentPublishedVersion: { reviewAction: null },
      }),
    ).toBe("archived");
  });

  it("blocks final acceptance only for active published work without approval", () => {
    expect(
      hasBlockingDeliverableReviews([
        { archivedAt: null, currentPublishedVersion: null },
        {
          archivedAt: "2026-07-23T10:00:00Z",
          currentPublishedVersion: { reviewAction: null },
        },
      ]),
    ).toBe(false);

    expect(
      hasBlockingDeliverableReviews([
        {
          archivedAt: null,
          currentPublishedVersion: { reviewAction: null },
        },
      ]),
    ).toBe(true);

    expect(
      hasBlockingDeliverableReviews([
        {
          archivedAt: null,
          currentPublishedVersion: { reviewAction: "approved" },
        },
      ]),
    ).toBe(false);
  });

  it("accepts only supported files within 15 MB", () => {
    expect(
      validateDeliverableFile({
        fileName: "anteprojeto.pdf",
        mimeType: "application/pdf",
        sizeBytes: DELIVERABLE_MAX_FILE_BYTES,
      }),
    ).toEqual({
      ok: true,
      value: {
        fileName: "anteprojeto.pdf",
        mimeType: "application/pdf",
        sizeBytes: DELIVERABLE_MAX_FILE_BYTES,
      },
    });

    expect(
      validateDeliverableFile({
        fileName: "modelo.rvt",
        mimeType: "application/octet-stream",
        sizeBytes: 1024,
      }),
    ).toMatchObject({ ok: false, code: "invalid_mime" });

    expect(
      validateDeliverableFile({
        fileName: "pasta/projeto.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }),
    ).toMatchObject({ ok: false, code: "invalid_file_name" });

    expect(
      validateDeliverableFile({
        fileName: "projeto.pdf",
        mimeType: "application/pdf",
        sizeBytes: DELIVERABLE_MAX_FILE_BYTES + 1,
      }),
    ).toMatchObject({ ok: false, code: "invalid_size" });
  });

  it("normalizes safe HTTPS links and rejects credentials or HTTP", () => {
    expect(
      validateDeliverableExternalUrl(
        " https://drive.google.com/file/d/abc/view ",
      ),
    ).toEqual({
      ok: true,
      value: "https://drive.google.com/file/d/abc/view",
    });
    expect(
      validateDeliverableExternalUrl("http://drive.google.com/file"),
    ).toMatchObject({ ok: false });
    expect(
      validateDeliverableExternalUrl("https://user:pass@example.com/file"),
    ).toMatchObject({ ok: false });
  });

  it("formats quotas without exposing raw bytes", () => {
    expect(formatStorageBytes(25 * 1024 * 1024)).toBe("25 MB");
    expect(formatStorageBytes(1024 * 1024 * 1024)).toBe("1 GB");
    expect(formatStorageBytes(5 * 1024 * 1024 * 1024)).toBe("5 GB");
  });
});
