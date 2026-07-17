import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { unzipSync } from "fflate";
import { readSheet } from "read-excel-file/node";

import type { Database, Json } from "../../src/lib/supabase/types";
import { CAIXA_SINAPI_2025_LAYOUT } from "./layouts/caixa-2025";
import {
  parseSinapiWorkbookRows,
  type SinapiRowsBySheet,
  type SinapiWorkbookLayout,
} from "./parser";

interface ImportArgs {
  sourcePath: string | null;
  outDir: string | null;
  emitEntries: boolean;
  publish: boolean;
  yes: boolean;
  revision: number;
  sourceUrl: string | null;
  supabaseUrl: string | null;
  serviceRoleKey: string | null;
}

interface LoadedWorkbook {
  input: string | Buffer;
  sourceBuffer: Buffer;
  sourceFileName: string;
  sourcePath: string;
  sourceSha256: string;
  sourceSizeBytes: number;
  workbookFileName: string;
}

interface PublishResult {
  releaseId: string;
  sourceStoragePath: string;
}

export async function runSinapiDryRunImport(args: ImportArgs) {
  const sourcePath = args.sourcePath ?? findLatestDefaultSource();
  const loaded = loadWorkbook(sourcePath, CAIXA_SINAPI_2025_LAYOUT);
  const rowsBySheet = await readWorkbookRows(
    loaded.input,
    CAIXA_SINAPI_2025_LAYOUT,
  );
  const parsed = parseSinapiWorkbookRows(rowsBySheet, CAIXA_SINAPI_2025_LAYOUT);
  const outDir =
    args.outDir ??
    path.resolve(".sinapi/reports", parsed.competence.slice(0, 7));

  mkdirSync(outDir, { recursive: true });
  const report = {
    approved: true,
    generated_at: new Date().toISOString(),
    source_file_name: loaded.sourceFileName,
    source_path: loaded.sourcePath,
    source_sha256: loaded.sourceSha256,
    source_size_bytes: loaded.sourceSizeBytes,
    workbook_file_name: loaded.workbookFileName,
    competence: parsed.competence,
    layout_id: parsed.layoutId,
    summary: parsed.summary,
  };

  const reportPath = path.join(outDir, "report.json");
  writeJson(reportPath, report);

  let entriesPath: string | null = null;
  if (args.emitEntries) {
    entriesPath = path.join(outDir, "entries.jsonl");
    writeFileSync(
      entriesPath,
      parsed.entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n",
      "utf8",
    );
  }

  let publishResult: PublishResult | null = null;
  if (args.publish) {
    if (!args.yes) {
      throw new Error("Publishing requires --yes.");
    }
    publishResult = await publishParsedRelease(args, loaded, report, parsed.entries);
  }

  return {
    reportPath,
    entriesPath,
    report,
    publishResult,
  };
}

async function readWorkbookRows(
  input: string | Buffer,
  layout: SinapiWorkbookLayout,
): Promise<SinapiRowsBySheet> {
  const rowsBySheet: SinapiRowsBySheet = {};
  const sheetNames = [
    layout.competence.sheetName,
    ...layout.sheets.map((sheet) => sheet.sheetName),
    layout.analyticalSheet.sheetName,
  ];

  for (const sheetName of new Set(sheetNames)) {
    rowsBySheet[sheetName] = (await readSheet(input, sheetName)) as SinapiRowsBySheet[string];
  }

  return rowsBySheet;
}

function loadWorkbook(
  sourcePath: string,
  layout: typeof CAIXA_SINAPI_2025_LAYOUT,
): LoadedWorkbook {
  if (!existsSync(sourcePath)) {
    throw new Error(`SINAPI source file not found: ${sourcePath}`);
  }

  const sourceBuffer = readFileSync(sourcePath);
  const sourceFileName = path.basename(sourcePath);
  const sourceSha256 = sha256(sourceBuffer);
  const sourceSizeBytes = statSync(sourcePath).size;

  if (/\.xlsx$/i.test(sourcePath)) {
    return {
      input: sourcePath,
      sourceFileName,
      sourcePath: path.resolve(sourcePath),
      sourceSha256,
      sourceSizeBytes,
      sourceBuffer,
      workbookFileName: sourceFileName,
    };
  }

  if (!/\.zip$/i.test(sourcePath)) {
    throw new Error("SINAPI source must be a .zip or .xlsx file");
  }

  const files = unzipSync(sourceBuffer);
  const workbookEntry = Object.entries(files).find(([fileName]) =>
    layout.workbookFilePattern.test(path.basename(fileName)),
  );
  if (!workbookEntry) {
    throw new Error("SINAPI reference workbook not found inside ZIP");
  }

  const [workbookFileName, workbookBytes] = workbookEntry;
  return {
    input: Buffer.from(workbookBytes),
    sourceFileName,
    sourcePath: path.resolve(sourcePath),
    sourceSha256,
    sourceSizeBytes,
    sourceBuffer,
    workbookFileName: repairZipFileName(path.basename(workbookFileName)),
  };
}

function findLatestDefaultSource() {
  const root = path.resolve(".sinapi/sources");
  if (!existsSync(root)) {
    throw new Error("SINAPI source folder not found. Pass --source <zip|xlsx>.");
  }

  const candidates: string[] = [];
  collectFiles(root, candidates);
  const source = candidates
    .filter((file) => /^SINAPI-\d{4}-\d{2}-formato-xlsx\.zip$/i.test(path.basename(file)))
    .sort()
    .at(-1);

  if (!source) {
    throw new Error("No SINAPI ZIP found. Pass --source <zip|xlsx>.");
  }
  return source;
}

function collectFiles(dir: string, files: string[]) {
  for (const name of readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
}

function parseArgs(argv: string[]): ImportArgs {
  const args: ImportArgs = {
    sourcePath: null,
    outDir: null,
    emitEntries: false,
    publish: false,
    yes: false,
    revision: 1,
    sourceUrl: null,
    supabaseUrl: null,
    serviceRoleKey: null,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--source") {
      args.sourcePath = readRequiredValue(argv, ++index, "--source");
    } else if (arg === "--out") {
      args.outDir = readRequiredValue(argv, ++index, "--out");
    } else if (arg === "--emit-entries") {
      args.emitEntries = true;
    } else if (arg === "--publish") {
      args.publish = true;
    } else if (arg === "--yes") {
      args.yes = true;
    } else if (arg === "--revision") {
      const revision = Number(readRequiredValue(argv, ++index, "--revision"));
      if (!Number.isInteger(revision) || revision <= 0) {
        throw new Error("--revision must be a positive integer");
      }
      args.revision = revision;
    } else if (arg === "--source-url") {
      args.sourceUrl = readRequiredValue(argv, ++index, "--source-url");
    } else if (arg === "--supabase-url") {
      args.supabaseUrl = readRequiredValue(argv, ++index, "--supabase-url");
    } else if (arg === "--service-role-key") {
      args.serviceRoleKey = readRequiredValue(argv, ++index, "--service-role-key");
    } else if (arg === "--dry-run") {
      continue;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function readRequiredValue(argv: string[], index: number, flag: string) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function sha256(buffer: Buffer | Uint8Array) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function publishParsedRelease(
  args: ImportArgs,
  loaded: LoadedWorkbook,
  report: Awaited<ReturnType<typeof runSinapiDryRunImport>>["report"],
  entries: ReturnType<typeof parseSinapiWorkbookRows>["entries"],
): Promise<PublishResult> {
  loadDotEnvLocal();
  const supabaseUrl = args.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    args.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or pass CLI flags.",
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const sourceStoragePath = `${report.competence.slice(0, 7)}/${
    loaded.sourceSha256
  }/${loaded.sourceFileName}`;

  await uploadSource(supabase, sourceStoragePath, loaded);
  const releaseId = await insertRelease(
    supabase,
    args,
    loaded,
    report,
    sourceStoragePath,
  );

  try {
    await insertEntries(supabase, releaseId, entries);
    await publishRelease(supabase, releaseId, loaded.sourceSha256);
  } catch (error) {
    await supabase
      .from("sinapi_releases")
      .delete()
      .eq("id", releaseId)
      .eq("status", "staging");
    throw error;
  }

  return { releaseId, sourceStoragePath };
}

async function uploadSource(
  supabase: SupabaseClient<Database>,
  sourceStoragePath: string,
  loaded: LoadedWorkbook,
) {
  const { error } = await supabase.storage
    .from("sinapi-sources")
    .upload(sourceStoragePath, loaded.sourceBuffer, {
      contentType: "application/zip",
      upsert: true,
    });
  if (error) {
    throw new Error(`Failed to upload SINAPI source: ${error.message}`);
  }
}

async function insertRelease(
  supabase: SupabaseClient<Database>,
  args: ImportArgs,
  loaded: LoadedWorkbook,
  report: Awaited<ReturnType<typeof runSinapiDryRunImport>>["report"],
  sourceStoragePath: string,
) {
  const sourceUrl = args.sourceUrl ?? defaultSourceUrl(report.competence);
  const validationSummary = {
    approved: true,
    source_file_name: report.source_file_name,
    workbook_file_name: report.workbook_file_name,
    generated_at: report.generated_at,
    summary: report.summary,
  } as unknown as Json;

  const { data, error } = await supabase
    .from("sinapi_releases")
    .insert({
      competence: report.competence,
      revision: args.revision,
      source_url: sourceUrl,
      source_file_name: loaded.sourceFileName,
      source_storage_path: sourceStoragePath,
      source_sha256: loaded.sourceSha256,
      source_size_bytes: loaded.sourceSizeBytes,
      layout_id: report.layout_id,
      imported_by: "prumo-sinapi-importer",
      row_count: report.summary.rowCount,
      priced_row_count: report.summary.pricedRowCount,
      validation_summary: validationSummary,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create SINAPI release: ${error.message}`);
  }
  return data.id;
}

async function insertEntries(
  supabase: SupabaseClient<Database>,
  releaseId: string,
  entries: ReturnType<typeof parseSinapiWorkbookRows>["entries"],
) {
  const batchSize = 500;
  for (let start = 0; start < entries.length; start += batchSize) {
    const batch = entries.slice(start, start + batchSize).map((entry) => ({
      release_id: releaseId,
      kind: entry.kind,
      code: entry.code,
      description: entry.description,
      unit: entry.unit,
      regime: entry.regime,
      prices_cents: entry.prices_cents as Json,
      price_metadata: entry.price_metadata as Json,
      search_text: entry.search_text,
    }));
    const { error } = await supabase.from("sinapi_entries").insert(batch);
    if (error) {
      throw new Error(
        `Failed to insert SINAPI entries ${start + 1}-${start + batch.length}: ${error.message}`,
      );
    }
  }
}

async function publishRelease(
  supabase: SupabaseClient<Database>,
  releaseId: string,
  expectedSha256: string,
) {
  const { error } = await supabase.rpc("publish_sinapi_release", {
    p_release_id: releaseId,
    p_expected_sha256: expectedSha256,
  });
  if (error) {
    throw new Error(`Failed to publish SINAPI release: ${error.message}`);
  }
}

function defaultSourceUrl(competence: string) {
  const [year, month] = competence.split("-");
  return `https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-${year}-${month}-formato-xlsx.zip`;
}

function repairZipFileName(value: string) {
  if (!/[ÃÂ]/.test(value)) return value;
  return Buffer.from(value, "latin1").toString("utf8");
}

function loadDotEnvLocal() {
  const envPath = path.resolve(".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (process.env[key]) continue;

    const rawValue = trimmed.slice(separator + 1).trim();
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const result = await runSinapiDryRunImport(parseArgs(process.argv.slice(2)));
  const summary = result.report.summary;

  console.log(`SINAPI ${result.report.competence} validated`);
  console.log(`Rows: ${summary.rowCount} (${summary.pricedRowCount} priced)`);
  console.log(`Report: ${result.reportPath}`);
  if (result.entriesPath) {
    console.log(`Entries: ${result.entriesPath}`);
  }
  if (result.publishResult) {
    console.log(`Published release: ${result.publishResult.releaseId}`);
    console.log(`Source storage: ${result.publishResult.sourceStoragePath}`);
  }
}

const executedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (executedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
