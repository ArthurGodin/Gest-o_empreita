import { describe, expect, it } from "vitest";
import {
  assertRestoreTargetIsSafe,
  BACKUP_FORMAT,
  expectedChecksumFromFile,
  REQUIRED_BACKUP_ENTRIES,
  validateBackupInventory,
} from "./backup-verification-core";

const manifest = JSON.stringify({
  created_at_utc: "2026-07-20T12:00:00.000Z",
  format: BACKUP_FORMAT,
  includes: ["public-database", "storage-objects"],
  excludes: ["managed-auth-schema"],
  encrypted_with: "age",
});

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
      validateBackupInventory(REQUIRED_BACKUP_ENTRIES, manifest).format,
    ).toBe(BACKUP_FORMAT);
    expect(() =>
      validateBackupInventory(
        REQUIRED_BACKUP_ENTRIES.filter((entry) => entry !== "data.sql"),
        manifest,
      ),
    ).toThrow("backup_entry_missing:data.sql");
  });

  it("rejects manifests that claim managed Auth coverage", () => {
    const dishonest = JSON.stringify({
      ...JSON.parse(manifest),
      excludes: [],
    });
    expect(() =>
      validateBackupInventory(REQUIRED_BACKUP_ENTRIES, dishonest),
    ).toThrow("backup_manifest_auth_scope_missing");
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
