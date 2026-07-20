import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Unzip, UnzipInflate } from "fflate";
import {
  expectedChecksumFromFile,
  validateBackupInventory,
} from "../src/lib/operations/backup-verification-core";

const args = parseArgs(process.argv.slice(2));
const archivePath = path.resolve(args.archive);
const checksumPath = path.resolve(args.checksum ?? `${archivePath}.sha256`);

if (!archivePath.endsWith(".zip.age")) {
  throw new Error("O pacote precisa terminar em .zip.age.");
}

const archiveStat = await stat(archivePath);
if (!archiveStat.isFile() || archiveStat.size === 0) {
  throw new Error("O pacote de backup está vazio ou não é um arquivo.");
}

const checksumText = await readFile(checksumPath, "utf8");
const expected = expectedChecksumFromFile(
  checksumText,
  path.basename(archivePath),
);
const actual = await sha256File(archivePath);
if (actual !== expected) throw new Error("O checksum do backup não confere.");

const identity = process.env.PRUMO_BACKUP_AGE_IDENTITY?.trim();
if (!identity) {
  process.stdout.write(
    JSON.stringify({
      ok: true,
      level: "checksum",
      encrypted: true,
      bytes: archiveStat.size,
    }) + "\n",
  );
  process.exit(0);
}

const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "prumo-backup-verify-"),
);
const plainArchive = path.join(temporaryDirectory, "backup.zip");

try {
  const decrypted = spawnSync(
    "age",
    ["--decrypt", "--identity", identity, "--output", plainArchive, archivePath],
    { stdio: "inherit" },
  );
  if (decrypted.status !== 0) {
    throw new Error("Não foi possível descriptografar o backup.");
  }

  const inventory = await readZipInventory(plainArchive);
  const verifiedManifest = validateBackupInventory(
    inventory.entries,
    inventory.manifest,
  );
  process.stdout.write(
    JSON.stringify({
      ok: true,
      level: "content",
      encrypted: true,
      bytes: archiveStat.size,
      format: verifiedManifest.format,
      created_at_utc: verifiedManifest.created_at_utc,
    }) + "\n",
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function readZipInventory(filePath: string) {
  const entries = new Set<string>();
  let manifest = "";
  let pendingFiles = 0;
  let inputFinished = false;

  return new Promise<{ entries: Set<string>; manifest: string }>(
    (resolve, reject) => {
      const maybeResolve = () => {
        if (inputFinished && pendingFiles === 0) resolve({ entries, manifest });
      };
      const unzip = new Unzip((file) => {
        entries.add(file.name);
        pendingFiles += 1;
        const manifestChunks: Uint8Array[] = [];
        let manifestBytes = 0;
        file.ondata = (error, data, final) => {
          if (error) {
            reject(error);
            return;
          }
          if (file.name === "manifest.json" && data.length > 0) {
            manifestBytes += data.length;
            if (manifestBytes > 64 * 1024) {
              reject(new Error("backup_manifest_too_large"));
              return;
            }
            manifestChunks.push(data);
          }
          if (final) {
            if (file.name === "manifest.json") {
              manifest = Buffer.concat(manifestChunks).toString("utf8");
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
    },
  );
}

function parseArgs(values: string[]) {
  let archive = "";
  let checksum: string | undefined;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--archive") archive = values[++index] ?? "";
    else if (value === "--checksum") checksum = values[++index];
    else throw new Error(`Argumento desconhecido: ${value}`);
  }
  if (!archive) {
    throw new Error("Use --archive <caminho-do-pacote.zip.age>.");
  }
  return { archive, checksum };
}
