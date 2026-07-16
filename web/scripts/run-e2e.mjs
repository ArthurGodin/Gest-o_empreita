import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(webDir, "..");
const supabaseCli = require.resolve("supabase/dist/supabase.js");
const playwrightCli = require.resolve("@playwright/test/cli");
const keepSupabase = process.env.PRUMO_E2E_KEEP_SUPABASE === "true";
let startedSupabase = false;

function supabase(args, options = {}) {
  return spawnSync(
    process.execPath,
    [supabaseCli, ...args, "--workdir", repoDir],
    {
      cwd: repoDir,
      encoding: options.encoding,
      stdio: options.stdio,
      env: process.env,
    },
  );
}

function localStatus() {
  return supabase(["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function ensureLocalNetwork() {
  const inspect = spawnSync("docker", ["network", "inspect", "prumo-local"], {
    stdio: "ignore",
  });
  if (inspect.status === 0) return;

  const created = spawnSync(
    "docker",
    [
      "network",
      "create",
      "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
      "prumo-local",
    ],
    { stdio: "inherit" },
  );
  if (created.status !== 0) {
    throw new Error("Nao foi possivel criar a rede local isolada do Supabase.");
  }
}

function startSupabaseIfNeeded() {
  if (localStatus().status === 0) return;

  const startArgs = ["start"];
  if (!process.env.CI) {
    ensureLocalNetwork();
    startArgs.push("--network-id", "prumo-local");
  }

  const started = supabase(startArgs, { stdio: "inherit" });
  if (started.status !== 0) {
    throw new Error(
      "Supabase local nao iniciou. Confirme que o Docker Desktop esta ativo.",
    );
  }
  startedSupabase = true;
}

function readLocalEnvironment() {
  const status = localStatus();
  if (status.status !== 0) {
    throw new Error(`Supabase local indisponivel: ${status.stderr}`);
  }
  return JSON.parse(status.stdout);
}

function resetLocalDatabase() {
  const reset = supabase(["db", "reset", "--local"], { stdio: "inherit" });
  if (reset.status !== 0) {
    throw new Error("As migrations nao reconstruiram o Supabase local.");
  }
}

function stopSupabaseIfOwned() {
  if (!startedSupabase || keepSupabase) return;
  supabase(["stop"], { stdio: "inherit" });
}

let exitCode = 1;
try {
  startSupabaseIfNeeded();
  // A fresh CI start already applies every migration and seed. Resetting it
  // immediately can race Docker DNS while Supabase restarts its services.
  if (!process.env.CI || !startedSupabase) {
    resetLocalDatabase();
  }
  const local = readLocalEnvironment();
  const testEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
    PRUMO_E2E_BASE_URL: "http://127.0.0.1:3100",
    PRUMO_E2E: "true",
    ASAAS_API_KEY: "",
    ASAAS_API_URL: "http://127.0.0.1:3999/v3",
    ASAAS_WEBHOOK_TOKEN: "prumo-e2e-webhook-token",
    RESEND_API_KEY: "",
    ALERT_EMAIL_TO: "",
    META_CONVERSIONS_ACCESS_TOKEN: "",
  };

  const playwright = spawnSync(
    process.execPath,
    [playwrightCli, "test", ...process.argv.slice(2)],
    {
      cwd: webDir,
      env: testEnv,
      stdio: "inherit",
    },
  );
  exitCode = playwright.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stopSupabaseIfOwned();
}

process.exit(exitCode);
