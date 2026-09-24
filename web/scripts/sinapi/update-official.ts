import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/types";
import { runSinapiDryRunImport } from "./import";

const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const MAX_DATABASE_BYTES = 400 * 1024 * 1024;
const MIN_IMPORT_RESERVE_BYTES = 128 * 1024 * 1024;
const OFFICIAL_BASE = "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais";

export function candidateCompetences(now: Date): string[] {
  return Array.from({ length: 4 }, (_, offset) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    return month.toISOString().slice(0, 7);
  });
}

export function hasImportCapacity(databaseBytes: number, rowCount: number): boolean {
  const reserve = Math.max(MIN_IMPORT_RESERVE_BYTES, rowCount * 2500);
  return Number.isFinite(databaseBytes) && databaseBytes >= 0 &&
    databaseBytes + reserve <= MAX_DATABASE_BYTES;
}

async function latestOfficialSource(now: Date) {
  let hadSuccessfulResponse = false;
  for (const competence of candidateCompetences(now)) {
    const url = `${OFFICIAL_BASE}/SINAPI-${competence}-formato-xlsx.zip`;
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    hadSuccessfulResponse = true;
    if (response.status !== 200) continue;
    const contentType = response.headers.get("content-type") ?? "";
    const contentLength = Number(response.headers.get("content-length"));
    if (!/zip|octet-stream/i.test(contentType) || !Number.isFinite(contentLength) ||
      contentLength < 1_000_000 || contentLength > MAX_SOURCE_BYTES) {
      throw new Error(`Unexpected CAIXA source response for ${competence}`);
    }
    return { competence, url };
  }
  if (!hadSuccessfulResponse) throw new Error("Unable to check official CAIXA sources");
  throw new Error("No recent official SINAPI XLSX package found");
}

async function downloadOfficialSource(competence: string, url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`CAIXA download failed: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 1_000_000 || data.length > MAX_SOURCE_BYTES ||
    data[0] !== 0x50 || data[1] !== 0x4b) {
    throw new Error("Official SINAPI response is not a valid-sized ZIP file");
  }
  const directory = path.resolve(".sinapi/sources", competence);
  mkdirSync(directory, { recursive: true });
  const sourcePath = path.join(directory, `SINAPI-${competence}-formato-xlsx.zip`);
  writeFileSync(sourcePath, data);
  console.log(`Official source SHA-256: ${createHash("sha256").update(data).digest("hex")}`);
  return sourcePath;
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase maintenance credentials are missing");

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { competence, url } = await latestOfficialSource(new Date());
  const { data: latest, error: releaseError } = await supabase
    .from("sinapi_releases")
    .select("competence, revision")
    .eq("status", "published")
    .order("competence", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (releaseError) throw releaseError;
  if (latest && latest.competence.slice(0, 7) >= competence) {
    console.log(`SINAPI ${latest.competence.slice(0, 7)} already published; no update needed.`);
    return;
  }

  const sourcePath = await downloadOfficialSource(competence, url);
  const importArgs = {
    sourcePath,
    outDir: null,
    emitEntries: false,
    publish: false,
    yes: false,
    revision: 1,
    sourceUrl: url,
    supabaseUrl,
    serviceRoleKey,
  };
  const validation = await runSinapiDryRunImport(importArgs);
  if (validation.report.competence.slice(0, 7) !== competence) {
    throw new Error("SINAPI workbook competence does not match the official filename");
  }
  const { data: databaseBytes, error: sizeError } = await supabase.rpc("get_sinapi_database_size");
  if (sizeError || databaseBytes == null) throw sizeError ?? new Error("Database size unavailable");
  if (!hasImportCapacity(Number(databaseBytes), validation.report.summary.rowCount)) {
    throw new Error(`SINAPI import paused: database capacity guard (${databaseBytes} bytes used).`);
  }

  const published = await runSinapiDryRunImport({ ...importArgs, publish: true, yes: true });
  console.log(`Published SINAPI ${competence}: ${published.publishResult?.releaseId}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
