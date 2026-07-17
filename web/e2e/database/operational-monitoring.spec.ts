import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "@/lib/supabase/types";

test("operational cron is private, idempotent and read-only", async ({
  request,
}) => {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = requiredEnv("CRON_SECRET");
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const runKey = `cron:${new Date().toISOString().slice(0, 10)}`;
  const before = await protectedFinancialState(admin);

  const unauthorized = await request.get("/api/cron/operational-health");
  expect(unauthorized.status()).toBe(401);
  expect(await unauthorized.json()).toEqual({
    ok: false,
    status: "unauthorized",
  });

  const headers = {
    authorization: `Bearer ${cronSecret}`,
    "user-agent": "vercel-cron/1.0",
  };
  const first = await request.get("/api/cron/operational-health", { headers });
  expect(first.status()).toBe(200);
  const firstBody = await first.json();
  expect(firstBody.ok).toBe(true);
  expect(["healthy", "warning", "critical"]).toContain(firstBody.status);

  const duplicate = await request.get("/api/cron/operational-health", {
    headers,
  });
  expect(duplicate.status()).toBe(200);
  expect(await duplicate.json()).toEqual({ ok: true, status: "skipped" });

  const after = await protectedFinancialState(admin);
  expect(after).toEqual(before);

  const { data: runs, error: runsError } = await admin
    .from("operational_monitor_runs")
    .select(
      "run_key, trigger, status, check_counts, incident_count, alert_count, error_code",
    )
    .eq("run_key", runKey);
  expect(runsError).toBeNull();
  expect(runs).toHaveLength(1);
  expect(runs?.[0]).toEqual(
    expect.objectContaining({
      run_key: runKey,
      trigger: "cron",
      status: firstBody.status,
    }),
  );

  const { data: incidents, error: incidentsError } = await admin
    .from("operational_incidents")
    .select("fingerprint, check_name, severity, status, summary, safe_context");
  expect(incidentsError).toBeNull();
  const serialized = JSON.stringify(incidents ?? []).toLowerCase();
  for (const forbidden of [
    "raw_payload",
    "cpf",
    "cnpj",
    "pix_key",
    "customer_name",
    "email",
    "phone",
    "checkout_url",
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
});

async function protectedFinancialState(
  admin: SupabaseClient<Database>,
) {
  const [charges, companies] = await Promise.all([
    admin
      .from("billing_charges")
      .select("id, status, paid_at, updated_at")
      .order("id"),
    admin
      .from("companies")
      .select(
        "id, plan, saas_asaas_subscription_id, saas_asaas_subscription_plan, saas_pending_checkout_started_at, updated_at",
      )
      .order("id"),
  ]);
  expect(charges.error).toBeNull();
  expect(companies.error).toBeNull();
  return { charges: charges.data ?? [], companies: companies.data ?? [] };
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}
