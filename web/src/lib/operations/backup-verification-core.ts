export const BACKUP_FORMAT = "prumo-supabase-logical-v2";
export const REQUIRED_BACKUP_ENTRIES = [
  "roles.sql",
  "schema.sql",
  "data.sql",
  "manifest.json",
  "storage/.empty",
] as const;

export interface BackupManifest {
  created_at_utc: string;
  format: string;
  includes: string[];
  excludes: string[];
  encrypted_with: string;
}

export function expectedChecksumFromFile(
  content: string,
  archiveName: string,
): string {
  const line = content.trim();
  const match = /^([a-fA-F0-9]{64})\s+\*?(.+)$/.exec(line);
  if (!match) throw new Error("backup_checksum_file_invalid");

  const recordedName = match[2]?.trim();
  if (recordedName !== archiveName) {
    throw new Error("backup_checksum_filename_mismatch");
  }
  return match[1]!.toLowerCase();
}

export function validateBackupInventory(
  entries: Iterable<string>,
  manifestText: string,
): BackupManifest {
  const normalizedEntries = new Set(
    [...entries].map((entry) => entry.replaceAll("\\", "/")),
  );
  for (const required of REQUIRED_BACKUP_ENTRIES) {
    if (!normalizedEntries.has(required)) {
      throw new Error(`backup_entry_missing:${required}`);
    }
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error("backup_manifest_invalid_json");
  }
  if (!isBackupManifest(manifest)) {
    throw new Error("backup_manifest_invalid");
  }
  if (manifest.format !== BACKUP_FORMAT) {
    throw new Error("backup_manifest_format_unsupported");
  }

  for (const requiredInclude of ["public-database", "storage-objects"]) {
    if (!manifest.includes.includes(requiredInclude)) {
      throw new Error(`backup_manifest_include_missing:${requiredInclude}`);
    }
  }
  if (!manifest.excludes.includes("managed-auth-schema")) {
    throw new Error("backup_manifest_auth_scope_missing");
  }
  if (manifest.encrypted_with !== "age") {
    throw new Error("backup_manifest_encryption_invalid");
  }
  if (!Number.isFinite(Date.parse(manifest.created_at_utc))) {
    throw new Error("backup_manifest_timestamp_invalid");
  }
  return manifest;
}

export function assertRestoreTargetIsSafe(input: {
  databaseUrl: string;
  allowRemoteDisposable: boolean;
  confirmation?: string;
  productionProjectRef?: string;
}) {
  let url: URL;
  try {
    url = new URL(input.databaseUrl);
  } catch {
    throw new Error("restore_database_url_invalid");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("restore_database_protocol_invalid");
  }

  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (local) return;

  if (!input.allowRemoteDisposable) {
    throw new Error("restore_remote_target_refused");
  }
  if (input.confirmation !== "DISPOSABLE_ONLY") {
    throw new Error("restore_confirmation_missing");
  }

  const productionRef = input.productionProjectRef?.trim().toLowerCase();
  if (!productionRef) throw new Error("restore_production_ref_required");
  if (host.includes(productionRef)) {
    throw new Error("restore_production_target_refused");
  }
}

function isBackupManifest(value: unknown): value is BackupManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BackupManifest>;
  return (
    typeof candidate.created_at_utc === "string" &&
    typeof candidate.format === "string" &&
    Array.isArray(candidate.includes) &&
    candidate.includes.every((item) => typeof item === "string") &&
    Array.isArray(candidate.excludes) &&
    candidate.excludes.every((item) => typeof item === "string") &&
    typeof candidate.encrypted_with === "string"
  );
}
