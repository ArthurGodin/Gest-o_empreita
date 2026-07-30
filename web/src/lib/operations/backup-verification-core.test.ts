import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertRestoreTargetIsSafe,
  BACKUP_FORMAT,
  CURRENT_BACKUP_REQUIRED_ENTRIES,
  expectedChecksumFromFile,
  LEGACY_BACKUP_FORMAT,
  REQUIRED_BACKUP_ENTRIES,
  validateBackupStorageObjects,
  validateBackupInventory,
  validateStorageBucketInventory,
} from "./backup-verification-core";

const manifest = JSON.stringify({
  created_at_utc: "2026-07-20T12:00:00.000Z",
  format: BACKUP_FORMAT,
  includes: ["public-database", "storage-objects"],
  excludes: ["managed-auth-schema"],
  encrypted_with: "age",
});

const storageBuckets = readFileSync(
  new URL("../../../../ops/storage-buckets.json", import.meta.url),
  "utf8",
);

describe("backup verification", () => {
  it("parses a checksum bound to the archive name", () => {
    const hash = "a".repeat(64);
    expect(
      expectedChecksumFromFile(`${hash}  prumo.zip.age\n`, "prumo.zip.age"),
    ).toBe(hash);
    expect(() =>
      expectedChecksumFromFile(`${hash}  other.zip.age`, "prumo.zip.age"),
    ).toThrow("backup_checksum_filename_mismatch");
  });

  it("requires every logical backup entry and an honest manifest", () => {
    expect(
      validateBackupInventory(CURRENT_BACKUP_REQUIRED_ENTRIES, manifest).format,
    ).toBe(BACKUP_FORMAT);
    expect(() =>
      validateBackupInventory(
        CURRENT_BACKUP_REQUIRED_ENTRIES.filter(
          (entry) => entry !== "data.sql",
        ),
        manifest,
      ),
    ).toThrow("backup_entry_missing:data.sql");
    expect(() =>
      validateBackupInventory(REQUIRED_BACKUP_ENTRIES, manifest),
    ).toThrow("backup_entry_missing:storage-buckets.json");
  });

  it("keeps legacy v2 packages verifiable without claiming complete Storage metadata", () => {
    const legacyManifest = JSON.stringify({
      ...JSON.parse(manifest),
      format: LEGACY_BACKUP_FORMAT,
    });

    expect(
      validateBackupInventory(REQUIRED_BACKUP_ENTRIES, legacyManifest).format,
    ).toBe(LEGACY_BACKUP_FORMAT);
  });

  it("rejects manifests that claim managed Auth coverage", () => {
    const dishonest = JSON.stringify({
      ...JSON.parse(manifest),
      excludes: [],
    });
    expect(() =>
      validateBackupInventory(CURRENT_BACKUP_REQUIRED_ENTRIES, dishonest),
    ).toThrow("backup_manifest_auth_scope_missing");
  });

  it("validates the canonical Storage bucket inventory", () => {
    const inventory = validateStorageBucketInventory(storageBuckets);

    expect(inventory.version).toBe(1);
    expect(inventory.buckets.map((bucket) => bucket.id)).toEqual([
      "company-logos",
      "quotes-pdf",
      "diary-photos",
      "sinapi-sources",
      "project-deliverables",
    ]);
    expect(
      inventory.buckets.find(
        (bucket) => bucket.id === "project-deliverables",
      ),
    ).toMatchObject({
      public: false,
      file_size_limit: 15_728_640,
    });
  });

  it("rejects duplicate or unsafe bucket definitions", () => {
    const parsed = JSON.parse(storageBuckets);
    parsed.buckets.push(parsed.buckets[0]);

    expect(() =>
      validateStorageBucketInventory(JSON.stringify(parsed)),
    ).toThrow("backup_storage_bucket_duplicate:company-logos");

    parsed.buckets = [
      {
        id: "../outside",
        name: "../outside",
        public: false,
        file_size_limit: null,
        allowed_mime_types: null,
      },
    ];
    expect(() =>
      validateStorageBucketInventory(JSON.stringify(parsed)),
    ).toThrow("backup_storage_bucket_invalid");
  });

  it("rejects Storage objects from buckets absent from the inventory", () => {
    const inventory = validateStorageBucketInventory(storageBuckets);
    expect(() =>
      validateBackupStorageObjects(
        [
          ...CURRENT_BACKUP_REQUIRED_ENTRIES,
          "storage/company-logos/company/logo.png",
          "storage/project-deliverables/company/project/file.pdf",
        ],
        inventory,
      ),
    ).not.toThrow();

    expect(() =>
      validateBackupStorageObjects(
        [
          ...CURRENT_BACKUP_REQUIRED_ENTRIES,
          "storage/unknown-bucket/file.txt",
        ],
        inventory,
      ),
    ).toThrow("backup_storage_bucket_unknown:unknown-bucket");
  });

  it("allows local restore targets without an override", () => {
    expect(() =>
      assertRestoreTargetIsSafe({
        databaseUrl: "postgresql://postgres:postgres@127.0.0.1:54322/restore",
        allowRemoteDisposable: false,
      }),
    ).not.toThrow();
  });

  it("requires explicit confirmation and refuses the production ref remotely", () => {
    expect(() =>
      assertRestoreTargetIsSafe({
        databaseUrl: "postgresql://postgres:secret@pooler.example.com/postgres",
        allowRemoteDisposable: false,
      }),
    ).toThrow("restore_remote_target_refused");

    expect(() =>
      assertRestoreTargetIsSafe({
        databaseUrl:
          "postgresql://postgres:secret@db.productionref.supabase.co/postgres",
        allowRemoteDisposable: true,
        confirmation: "DISPOSABLE_ONLY",
        productionProjectRef: "productionref",
      }),
    ).toThrow("restore_production_target_refused");
  });
});
