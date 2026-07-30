import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Unzip, UnzipInflate } from "fflate";
import {
  BACKUP_FORMAT,
  expectedChecksumFromFile,
  validateBackupInventory,
  validateBackupStorageObjects,
  validateStorageBucketInventory,
} from "../src/lib/operations/backup-verification-core";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const archivePath = path.resolve(args.archive);
  const checksumPath = path.resolve(args.checksum ?? `${archivePath}.sha256`);

  if (!archivePath.endsWith(".zip.age")) {
    throw new Error("O pacote precisa terminar em .zip.age.");
  }

  const archiveStat = await safeStat(archivePath);
  if (!archiveStat.isFile() || archiveStat.size === 0) {
    throw new Error("O pacote de backup esta vazio ou nao e um arquivo.");
  }

  const checksumText = await safeReadText(
    checksumPath,
    "O arquivo de checksum nao foi encontrado ou nao pode ser lido.",
  );
  const expected = expectedChecksumFromFile(
    checksumText,
    path.basename(archivePath),
  );
  const actual = await sha256File(archivePath);
  if (actual !== expected) throw new Error("O checksum do backup nao confere.");

  const identity = process.env.PRUMO_BACKUP_AGE_IDENTITY?.trim();
  if (!identity) {
    writeResult({
      ok: true,
      level: "checksum",
      encrypted: true,
      bytes: archiveStat.size,
    });
    return;
  }

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "prumo-backup-verify-"),
  );
  const plainArchive = path.join(temporaryDirectory, "backup.zip");

  try {
    const decrypted = spawnSync(
      "age",
      [
        "--decrypt",
        "--identity",
        identity,
        "--output",
        plainArchive,
        archivePath,
      ],
      { stdio: "ignore" },
    );
    if (decrypted.status !== 0) {
      throw new Error("Nao foi possivel descriptografar o backup.");
    }

    const inventory = await readZipInventory(plainArchive);
    const verifiedManifest = validateBackupInventory(
      inventory.entries,
      inventory.manifest,
    );
    const storageInventory =
      verifiedManifest.format === BACKUP_FORMAT
        ? validateStorageBucketInventory(inventory.storageBuckets)
        : null;

    if (storageInventory) {
      validateBackupStorageObjects(inventory.entries, storageInventory);
    }

    writeResult({
      ok: true,
      level: "content",
      encrypted: true,
      bytes: archiveStat.size,
      format: verifiedManifest.format,
      created_at_utc: verifiedManifest.created_at_utc,
      storage_metadata: storageInventory ? "complete" : "legacy_missing",
      storage_buckets: storageInventory?.buckets.length ?? null,
    });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function readZipInventory(filePath: string) {
  const entries = new Set<string>();
  let manifest = "";
  let storageBuckets = "";
  let pendingFiles = 0;
  let inputFinished = false;

  return new Promise<{
    entries: Set<string>;
    manifest: string;
    storageBuckets: string;
  }>((resolve, reject) => {
    const maybeResolve = () => {
      if (inputFinished && pendingFiles === 0) {
        resolve({ entries, manifest, storageBuckets });
      }
    };
    const unzip = new Unzip((file) => {
      entries.add(file.name);
      pendingFiles += 1;
      const capture =
        file.name === "manifest.json" ||
        file.name === "storage-buckets.json";
      const capturedChunks: Uint8Array[] = [];
      let capturedBytes = 0;

      file.ondata = (error, data, final) => {
        if (error) {
          reject(error);
          return;
        }
        if (capture && data.length > 0) {
          capturedBytes += data.length;
          if (capturedBytes > 64 * 1024) {
            reject(new Error("backup_inventory_file_too_large"));
            return;
          }
          capturedChunks.push(data);
        }
        if (final) {
          if (file.name === "manifest.json") {
            manifest = Buffer.concat(capturedChunks).toString("utf8");
          } else if (file.name === "storage-buckets.json") {
            storageBuckets = Buffer.concat(capturedChunks).toString("utf8");
          }
          pendingFiles -= 1;
          maybeResolve();
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);

    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => {
      const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      unzip.push(new Uint8Array(bytes), false);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      try {
        unzip.push(new Uint8Array(0), true);
        inputFinished = true;
        maybeResolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

function parseArgs(values: string[]) {
  let archive = "";
  let checksum: string | undefined;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--help" || value === "-h") {
      return { help: true as const };
    }
    if (value === "--archive") archive = values[++index] ?? "";
    else if (value === "--checksum") checksum = values[++index];
    else throw new Error("Foi informado um argumento desconhecido.");
  }

  if (!archive) {
    throw new Error("Use --archive <caminho-do-pacote.zip.age>.");
  }
  return { help: false as const, archive, checksum };
}

async function safeStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    throw new Error("O pacote de backup nao foi encontrado ou nao pode ser lido.");
  }
}

async function safeReadText(filePath: string, message: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    throw new Error(message);
  }
}

function writeResult(result: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function printHelp() {
  process.stdout.write(
    [
      "Verifica checksum e, quando PRUMO_BACKUP_AGE_IDENTITY existir, o conteudo.",
      "",
      "Uso:",
      "  npm run backup:verify -- --archive <pacote.zip.age> [--checksum <arquivo.sha256>]",
      "",
    ].join("\n"),
  );
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Nao foi possivel verificar o backup.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
