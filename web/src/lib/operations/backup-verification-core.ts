export const BACKUP_FORMAT = "prumo-supabase-logical-v3";
export const LEGACY_BACKUP_FORMAT = "prumo-supabase-logical-v2";
export const REQUIRED_BACKUP_ENTRIES = [
  "roles.sql",
  "schema.sql",
  "data.sql",
  "manifest.json",
  "storage/.empty",
] as const;
export const CURRENT_BACKUP_REQUIRED_ENTRIES = [
  ...REQUIRED_BACKUP_ENTRIES,
  "storage-buckets.json",
] as const;

export interface BackupManifest {
  created_at_utc: string;
  format: string;
  includes: string[];
  excludes: string[];
  encrypted_with: string;
}

export interface StorageBucketDefinition {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

export interface StorageBucketInventory {
  version: 1;
  buckets: StorageBucketDefinition[];
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

  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error("backup_manifest_invalid_json");
  }
  if (!isBackupManifest(manifest)) {
    throw new Error("backup_manifest_invalid");
  }
  if (
    manifest.format !== BACKUP_FORMAT &&
    manifest.format !== LEGACY_BACKUP_FORMAT
  ) {
    throw new Error("backup_manifest_format_unsupported");
  }

  const requiredEntries =
    manifest.format === BACKUP_FORMAT
      ? CURRENT_BACKUP_REQUIRED_ENTRIES
      : REQUIRED_BACKUP_ENTRIES;
  for (const required of requiredEntries) {
    if (!normalizedEntries.has(required)) {
      throw new Error(`backup_entry_missing:${required}`);
    }
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

export function validateStorageBucketInventory(
  content: string,
): StorageBucketInventory {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("backup_storage_inventory_invalid_json");
  }

  if (!value || typeof value !== "object") {
    throw new Error("backup_storage_inventory_invalid");
  }

  const candidate = value as {
    version?: unknown;
    buckets?: unknown;
  };
  if (candidate.version !== 1 || !Array.isArray(candidate.buckets)) {
    throw new Error("backup_storage_inventory_invalid");
  }

  const seen = new Set<string>();
  const buckets = candidate.buckets.map((bucket) => {
    if (!isStorageBucketDefinition(bucket)) {
      throw new Error("backup_storage_bucket_invalid");
    }
    if (seen.has(bucket.id)) {
      throw new Error(`backup_storage_bucket_duplicate:${bucket.id}`);
    }
    seen.add(bucket.id);
    return {
      ...bucket,
      allowed_mime_types: bucket.allowed_mime_types
        ? [...bucket.allowed_mime_types]
        : null,
    };
  });

  if (buckets.length === 0) {
    throw new Error("backup_storage_inventory_empty");
  }

  return { version: 1, buckets };
}

export function validateBackupStorageObjects(
  entries: Iterable<string>,
  inventory: StorageBucketInventory,
) {
  const knownBuckets = new Set(inventory.buckets.map((bucket) => bucket.id));

  for (const rawEntry of entries) {
    const entry = rawEntry.replaceAll("\\", "/");
    if (!entry.startsWith("storage/") || entry === "storage/.empty") continue;

    const bucket = entry.slice("storage/".length).split("/")[0];
    if (!bucket || bucket === ".empty") continue;
    if (!knownBuckets.has(bucket)) {
      throw new Error(`backup_storage_bucket_unknown:${bucket}`);
    }
  }
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

function isStorageBucketDefinition(
  value: unknown,
): value is StorageBucketDefinition {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<StorageBucketDefinition>;
  const safeBucketId =
    typeof candidate.id === "string" &&
    /^[a-z0-9][a-z0-9-]{0,99}$/.test(candidate.id);
  const safeName =
    typeof candidate.name === "string" && candidate.name === candidate.id;
  const validSize =
    candidate.file_size_limit === null ||
    (Number.isSafeInteger(candidate.file_size_limit) &&
      Number(candidate.file_size_limit) > 0);
  const validMimeTypes =
    candidate.allowed_mime_types === null ||
    (Array.isArray(candidate.allowed_mime_types) &&
      candidate.allowed_mime_types.length > 0 &&
      new Set(candidate.allowed_mime_types).size ===
        candidate.allowed_mime_types.length &&
      candidate.allowed_mime_types.every(
        (mime) =>
          typeof mime === "string" &&
          /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+*-]*$/i.test(mime),
      ));

  return (
    safeBucketId &&
    safeName &&
    typeof candidate.public === "boolean" &&
    validSize &&
    validMimeTypes
  );
}
