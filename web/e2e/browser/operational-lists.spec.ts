import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test("operational lists remain usable with real data at reference viewports", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "A single desktop context covers every reference viewport.",
  );
  test.setTimeout(120_000);

  const suffix = crypto.randomUUID();
  const email = `operations-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Operations-2026!";
  const browserErrors = collectBrowserErrors(page);

  try {
    await createWorkspaceWithDemoData(page, email, password);

    await test.step("filter projects on a narrow mobile viewport", async () => {
      await openAtViewport(page, testInfo, {
        width: 375,
        height: 812,
        path: "/app/obras",
        heading: "Obras",
      });
      await expect(
        page.getByText(
          "Acompanhe execu\u00e7\u00e3o, prazo, custos e cobran\u00e7as em um s\u00f3 lugar.",
        ),
      ).toBeVisible();

      await page.getByLabel("Buscar obras").fill("cobertura");
      await page
        .getByLabel("Filtrar obras por status")
        .selectOption("in_progress");
      await expect(page).toHaveURL(/q=cobertura/);
      await expect(page).toHaveURL(/status=in_progress/);
      await expect(page.getByRole("link", { name: /Abrir obra Demo/ })).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "projects-375x812");
    });

    await test.step("filter quotes on a mobile viewport", async () => {
      await openAtViewport(page, testInfo, {
        width: 390,
        height: 844,
        path: "/app/orcamentos",
        heading: "Or\u00e7amentos",
      });

      await page.getByLabel("Buscar or\u00e7amentos").fill("maria");
      await page
        .getByLabel("Filtrar or\u00e7amentos por status")
        .selectOption("approved");
      await expect(page).toHaveURL(/q=maria/);
      await expect(page).toHaveURL(/status=approved/);
      await expect(
        page.getByRole("link", { name: /Abrir or\u00e7amento ORC-/ }),
      ).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "quotes-390x844");
    });

    await test.step("search customers on a tablet viewport", async () => {
      await openAtViewport(page, testInfo, {
        width: 768,
        height: 1024,
        path: "/app/clientes",
        heading: "Clientes",
      });

      await page.getByLabel("Buscar clientes").fill("maria");
      await expect(page.getByText("Cliente Demo - Maria Santos")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "customers-768x1024");
    });

    await test.step("show financial metrics on desktop", async () => {
      await openAtViewport(page, testInfo, {
        width: 1440,
        height: 900,
        path: "/app/financeiro",
        heading: "Financeiro",
      });

      await expect(page.getByText("A receber").first()).toBeVisible();
      await expect(page.locator("aside")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "finance-1440x900");
    });

    expect(browserErrors).toEqual([]);
  } finally {
    await cleanupAccount(email);
  }
});

async function createWorkspaceWithDemoData(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/signup");
  await page.getByLabel("Seu nome").fill("Responsavel Operacional");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel(/Nome da empresa/).fill("Prumo QA Operacional");
  await page.getByLabel("Telefone comercial").fill("11999990000");
  await page.getByLabel("Cidade").fill("Sao Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/app(?:\?|$)/);

  await page.getByRole("button", { name: "Explorar com exemplo" }).click();
  await expect(page).toHaveURL(/\/app\/orcamentos\/[0-9a-f-]+$/);
}

async function openAtViewport(
  page: Page,
  testInfo: TestInfo,
  options: {
    width: number;
    height: number;
    path: string;
    heading: string;
  },
) {
  await page.setViewportSize({ width: options.width, height: options.height });
  await page.goto(options.path);
  await expect(
    page.getByRole("heading", { name: options.heading, level: 1 }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await testInfo.attach(`${options.path}-${options.width}x${options.height}-initial`, {
    body: await page.screenshot({ fullPage: true, caret: "initial" }),
    contentType: "image/png",
  });
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

async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  await testInfo.attach(name, {
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

async function cleanupAccount(email: string) {
  const admin = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
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

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}
