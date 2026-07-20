import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { completeCompanyOnboarding } from "../helpers/onboarding";

test("objective pendencies stay compact, private and actionable", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "One browser covers mobile and desktop reference viewports.",
  );
  test.setTimeout(120_000);

  const suffix = crypto.randomUUID();
  const email = `pendencies-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Pendencies-2026!";
  const browserErrors = collectBrowserErrors(page);
  const analyticsPayloads: Array<Record<string, unknown>> = [];

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
  });
  page.on("request", (request) => {
    if (!request.url().includes("/api/product-events")) return;
    const body = request.postData();
    if (!body) return;
    try {
      analyticsPayloads.push(JSON.parse(body) as Record<string, unknown>);
    } catch {
      // The API rejects malformed analytics; this test only inspects valid JSON.
    }
  });

  try {
    await createWorkspace(page, email, password);
    await seedObjectivePendencies(email, suffix);

    await test.step("dashboard limits the mobile summary to five items", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/app");

      const summary = page.getByTestId("pendency-summary");
      await expect(summary.getByText("Pendências", { exact: true })).toBeVisible();
      await expect(summary.locator("a[href^='/app/']")).toHaveCount(6);
      await expect(summary.getByText("6", { exact: true })).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });

    await test.step("complete center filters through real URLs", async () => {
      await page
        .getByTestId("pendency-summary")
        .getByRole("link", { name: "Ver todas" })
        .click();
      await expect(page).toHaveURL(/\/app\/pendencias$/);
      await expect(
        page.getByRole("heading", { name: "Pendências", level: 1 }),
      ).toBeVisible();
      await expect(page.getByTestId("pendency-list").locator("a")).toHaveCount(6);

      await page.getByRole("link", { name: /^Cobranças 2$/ }).click();
      await expect(page).toHaveURL(/categoria=billing/);
      await expect(page.getByTestId("pendency-list").locator("a")).toHaveCount(2);

      await page.getByRole("link", { name: /^Obras 1$/ }).click();
      await expect(page).toHaveURL(/categoria=projects/);
      await expect(page.getByTestId("pendency-list").locator("a")).toHaveCount(1);

      await page.getByRole("link", { name: /^Orçamentos 3$/ }).click();
      await expect(page).toHaveURL(/categoria=quotes/);
      await expect(page.getByTestId("pendency-list").locator("a")).toHaveCount(3);

      await page.goto("/app/pendencias?categoria=invalida");
      await expect(page.getByRole("link", { name: /^Todas 6$/ })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await assertNoHorizontalOverflow(page);
    });

    await test.step("click analytics contains no operational content", async () => {
      await page
        .getByTestId("pendency-list")
        .getByRole("link", { name: /Cobrança vencida/ })
        .click();
      await expect(page).toHaveURL(/\/app\/obras\/[0-9a-f-]+/);

      await expect
        .poll(() =>
          analyticsPayloads.some((payload) => payload.name === "pendency_clicked"),
        )
        .toBe(true);
      const pendencyEvents = analyticsPayloads.filter((payload) =>
        String(payload.name).startsWith("pendency_"),
      );
      const serialized = JSON.stringify(pendencyEvents);
      expect(serialized).not.toContain("Cliente Pendencias");
      expect(serialized).not.toContain("Obra Pendencias");
      expect(serialized).not.toContain("ORC-PEND");
      expect(serialized).not.toContain("250000");
    });

    await test.step("desktop center remains dense and readable", async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/app/pendencias");
      await expect(page.getByTestId("pendency-list").locator("a")).toHaveCount(6);
      await expect(page.locator("aside")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await testInfo.attach("pendencies-1440x900", {
        body: await page.screenshot({ fullPage: true, caret: "initial" }),
        contentType: "image/png",
      });
    });

    expect(browserErrors).toEqual([]);
  } finally {
    await cleanupAccount(email);
  }
});

async function createWorkspace(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Seu nome").fill("Responsavel Pendencias");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await completeCompanyOnboarding(page, "Prumo QA Pendencias");
}

async function seedObjectivePendencies(email: string, suffix: string) {
  const admin = adminClient();
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  expect(usersError).toBeNull();
  const user = users.users.find((candidate) => candidate.email === email);
  expect(user).toBeTruthy();

  const { data: membership, error: membershipError } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user!.id)
    .single();
  expect(membershipError).toBeNull();

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      company_id: membership!.company_id,
      name: "Cliente Pendencias",
      created_by: user!.id,
    })
    .select("id")
    .single();
  expect(customerError).toBeNull();

  const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const pastTimestamp = `${pastDate}T12:00:00.000Z`;

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      company_id: membership!.company_id,
      customer_id: customer!.id,
      name: "Obra Pendencias",
      status: "in_progress",
      ends_on: pastDate,
      delivery_approved_at: pastTimestamp,
      budget_cents: 500_000,
      created_by: user!.id,
    })
    .select("id")
    .single();
  expect(projectError).toBeNull();

  const { error: chargeError } = await admin.from("billing_charges").insert({
    company_id: membership!.company_id,
    customer_id: customer!.id,
    project_id: project!.id,
    kind: "entrada",
    status: "pending",
    payment_provider: "manual_pix",
    amount_cents: 250_000,
    due_date: pastDate,
  });
  expect(chargeError).toBeNull();

  const quoteRows = [
    { status: "approved" as const, approved_at: pastTimestamp, valid_until: null },
    { status: "approved" as const, approved_at: pastTimestamp, valid_until: null },
    { status: "expired" as const, approved_at: null, valid_until: pastDate },
  ].map((quote, index) => ({
    company_id: membership!.company_id,
    customer_id: customer!.id,
    number: `ORC-PEND-${suffix.slice(0, 6)}-${index + 1}`,
    title: `Proposta Pendencias ${index + 1}`,
    subtotal_cents: 100_000,
    total_cents: 100_000,
    created_by: user!.id,
    ...quote,
  }));
  const { error: quotesError } = await admin.from("quotes").insert(quoteRows);
  expect(quotesError).toBeNull();
}

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
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

function adminClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}
