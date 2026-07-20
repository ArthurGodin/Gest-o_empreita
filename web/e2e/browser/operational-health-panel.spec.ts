import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { completeCompanyOnboarding } from "../helpers/onboarding";

const ADMIN_EMAIL = "health-admin@prumo.test";
const PASSWORD = "Prumo-E2E-Health-2026!";
const INCIDENT_FINGERPRINT =
  "asaas:payment:remote-paid-local-pending:8df90f2d-51b2-4ad8-9dac-f886165736c1";

test("operational health panel stays private, sanitized and responsive", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "A single desktop context covers authorization and reference viewports.",
  );
  test.setTimeout(150_000);
  const ordinaryEmail = `health-common-${crypto.randomUUID()}@prumo.test`;
  const browserErrors = collectBrowserErrors(page);
  let runId: string | null = null;

  try {
    await createWorkspace(page, ordinaryEmail, "Prumo QA Cliente");
    await page.goto("/app/configuracoes");
    await expect(page.getByRole("link", { name: /Saúde do Prumo/ })).toHaveCount(0);
    await page.goto("/app/configuracoes/saude-operacional");
    await expect(page.getByRole("heading", { name: /caminho não existe/i })).toBeVisible();

    await page.context().clearCookies();
    await createWorkspace(page, ADMIN_EMAIL, "Prumo QA Operação");
    runId = await seedOperationalState();

    await page.goto("/app/configuracoes");
    await expect(page.getByRole("link", { name: /Saúde do Prumo/ })).toBeVisible();

    await checkViewport(page, testInfo, 375, 812, "health-panel-375x812");
    await expect(page.getByRole("heading", { name: /falha que exige verificação/i })).toBeVisible();
    await expect(page.getByText("Conciliação de cobranças")).toBeVisible();

    const html = await page.content();
    expect(html).not.toContain("8df90f2d-51b2-4ad8-9dac-f886165736c1");
    expect(html).not.toContain("fingerprint");
    expect(html).not.toContain("safe_context");

    await checkViewport(page, testInfo, 1440, 900, "health-panel-1440x900");
    expect(browserErrors).toEqual([]);
  } finally {
    await cleanupOperationalState(runId);
    await cleanupAccount(ordinaryEmail);
    await cleanupAccount(ADMIN_EMAIL);
  }
});

async function createWorkspace(page: Page, email: string, companyName: string) {
  await page.goto("/signup");
  await page.getByLabel("Seu nome").fill("Responsavel QA");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await completeCompanyOnboarding(page, companyName);
}

async function seedOperationalState() {
  const admin = adminClient();
  const startedAt = new Date(Date.now() - 5 * 60_000).toISOString();
  const finishedAt = new Date(Date.now() - 4 * 60_000).toISOString();
  const runKey = `manual:${crypto.randomUUID()}`;

  const { data: run, error: insertError } = await admin
    .from("operational_monitor_runs")
    .insert({ run_key: runKey, trigger: "manual", started_at: startedAt })
    .select("id")
    .single();
  if (insertError || !run) throw insertError ?? new Error("Run not created");

  const { error: finishError } = await admin
    .from("operational_monitor_runs")
    .update({
      status: "critical",
      finished_at: finishedAt,
      check_counts: { healthy: 5, warning: 0, critical: 1 },
      incident_count: 1,
      alert_count: 1,
    })
    .eq("id", run.id);
  if (finishError) throw finishError;

  const { error: incidentError } = await admin
    .from("operational_incidents")
    .insert({
      fingerprint: INCIDENT_FINGERPRINT,
      check_name: "asaas_payment",
      severity: "critical",
      status: "open",
      summary: "Fixed E2E summary without customer data.",
      safe_context: {},
      first_seen_at: startedAt,
      last_seen_at: finishedAt,
      occurrence_count: 1,
    });
  if (incidentError) throw incidentError;
  return run.id;
}

async function checkViewport(
  page: Page,
  testInfo: TestInfo,
  width: number,
  height: number,
  screenshot: string,
) {
  await page.setViewportSize({ width, height });
  await page.goto("/app/configuracoes/saude-operacional");
  await expect(page.getByRole("heading", { name: "Saúde do Prumo", level: 1 })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);

  await testInfo.attach(screenshot, {
    body: await page.screenshot({ fullPage: true, caret: "initial" }),
    contentType: "image/png",
  });
}

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

function adminClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function cleanupAccount(email: string) {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) return;

  const { data: memberships } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id);
  for (const membership of memberships ?? []) {
    await admin.from("companies").delete().eq("id", membership.company_id);
  }
  await admin.auth.admin.deleteUser(user.id);
}

async function cleanupOperationalState(runId: string | null) {
  const admin = adminClient();
  await admin
    .from("operational_incidents")
    .delete()
    .eq("fingerprint", INCIDENT_FINGERPRINT);
  if (runId) {
    await admin.from("operational_monitor_runs").delete().eq("id", runId);
  }
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}
