import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
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

async function resetLocalDatabase() {
  const reset = spawn(
    process.execPath,
    [supabaseCli, "db", "reset", "--local", "--workdir", repoDir],
    { cwd: repoDir, env: process.env, stdio: "inherit" },
  );
  const reconnectTimer = process.env.CI
    ? null
    : setInterval(() => reconnectLocalDatabase(true), 500);
  const status = await new Promise((resolve) => reset.once("close", resolve));
  if (reconnectTimer) clearInterval(reconnectTimer);
  if (status !== 0) {
    throw new Error("As migrations nao reconstruiram o Supabase local.");
  }
}

function reconnectLocalDatabase(optional = false) {
  if (process.env.CI) return;

  const databaseContainer = "supabase_db_gestao-empreita";
  const inspect = spawnSync(
    "docker",
    ["network", "inspect", "prumo-local", "--format", "{{json .Containers}}"],
    { encoding: "utf8" },
  );
  if (inspect.status !== 0) {
    if (optional) return;
    throw new Error("Nao foi possivel inspecionar a rede local do Supabase.");
  }
  if (inspect.stdout.includes(databaseContainer)) return;

  const container = spawnSync(
    "docker",
    ["inspect", databaseContainer, "--format", "{{.State.Status}}"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  if (container.status !== 0) {
    if (optional) return;
    throw new Error("O container local do banco nao foi encontrado.");
  }

  const connected = spawnSync(
    "docker",
    ["network", "connect", "prumo-local", databaseContainer],
    { stdio: optional ? "ignore" : "inherit" },
  );
  if (connected.status !== 0) {
    if (optional) return;
    throw new Error("Nao foi possivel reconectar o banco a rede local isolada.");
  }
}

function restartLocalGateway(apiUrl) {
  const port = new URL(apiUrl).port;
  const gateway = spawnSync(
    "docker",
    [
      "ps",
      "--filter",
      "name=supabase_kong_",
      "--filter",
      "publish=" + port,
      "--format",
      "{{.ID}}",
    ],
    { encoding: "utf8" },
  );
  const ids = gateway.stdout?.trim().split(/\r?\n/).filter(Boolean) ?? [];
  if (gateway.status !== 0 || ids.length !== 1) {
    throw new Error("Nao foi possivel identificar o gateway Supabase local.");
  }

  const restarted = spawnSync("docker", ["restart", ids[0]], {
    stdio: "ignore",
  });
  if (restarted.status !== 0) {
    throw new Error("Nao foi possivel reiniciar o gateway Supabase local.");
  }
}

async function waitForLocalAuth(apiUrl) {
  const healthUrl = new URL("/auth/v1/health", apiUrl);
  const deadline = Date.now() + 60_000;
  let consecutiveHealthyResponses = 0;

  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(healthUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
      consecutiveHealthyResponses = response.ok
        ? consecutiveHealthyResponses + 1
        : 0;
      if (consecutiveHealthyResponses >= 2) return;
    } catch {
      consecutiveHealthyResponses = 0;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error("Supabase Auth local nao ficou saudavel apos o reset.");
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
  const shouldResetDatabase = !process.env.CI || !startedSupabase;
  if (shouldResetDatabase) {
    await resetLocalDatabase();
    reconnectLocalDatabase();
  }
  rmSync(path.join(webDir, ".next"), { recursive: true, force: true });
  const local = readLocalEnvironment();
  if (shouldResetDatabase) {
    restartLocalGateway(local.API_URL);
  }
  await waitForLocalAuth(local.API_URL);
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
    CRON_SECRET: "prumo-e2e-operational-cron-secret-2026-07-17",
    RESEND_API_KEY: "",
    ALERT_EMAIL_TO: "",
    OPERATIONAL_ADMIN_EMAILS: "health-admin@prumo.test",
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
