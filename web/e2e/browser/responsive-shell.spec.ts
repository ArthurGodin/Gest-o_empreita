import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test("app shell fits every reference viewport", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "A single desktop context covers every reference viewport.",
  );
  test.setTimeout(120_000);

  const suffix = crypto.randomUUID();
  const email = `responsive-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Responsive-2026!";

  try {
    await page.goto("/signup");
    await page.getByLabel("Seu nome").fill("Responsavel Responsivo");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    await page.getByLabel(/Nome da empresa/).fill("Prumo QA Responsivo");
    await page.getByLabel("Telefone comercial").fill("11999990000");
    await page.getByLabel("Cidade").fill("Sao Paulo");
    await page.getByLabel("UF").fill("SP");
    await page.getByRole("button", { name: "Entrar no painel" }).click();
    await expect(page).toHaveURL(/\/app(?:\?|$)/);

    await checkViewport(page, testInfo, {
      width: 375,
      height: 812,
      path: "/app",
      heading: "In.cio",
      screenshot: "app-375x812",
    });
    await expect(page.getByLabel("Abrir menu da conta")).toBeVisible();
    await page.getByLabel("Abrir menu da conta").click();
    await expect(
      page.getByRole("menuitem", { name: /Planos e assinatura/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /Configura..es/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Sair da conta" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await checkViewport(page, testInfo, {
      width: 390,
      height: 844,
      path: "/app/orcamentos",
      heading: "Or.amentos",
      screenshot: "quotes-390x844",
    });

    await checkViewport(page, testInfo, {
      width: 768,
      height: 1024,
      path: "/app/configuracoes",
      heading: "Configura..es",
      screenshot: "settings-768x1024",
    });
    await expect(page.getByLabel("Abrir menu da conta")).toBeVisible();

    await checkViewport(page, testInfo, {
      width: 1440,
      height: 900,
      path: "/app",
      heading: "In.cio",
      screenshot: "app-1440x900",
    });
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByLabel("Abrir menu da conta")).toBeHidden();
  } finally {
    await cleanupAccount(email);
  }
});

async function checkViewport(
  page: Page,
  testInfo: TestInfo,
  options: {
    width: number;
    height: number;
    path: string;
    heading: string;
    screenshot: string;
  },
) {
  await page.setViewportSize({ width: options.width, height: options.height });
  await page.goto(options.path);
  await expect(
    page.getByRole("heading", {
      name: new RegExp(options.heading, "i"),
      level: 1,
    }),
  ).toBeVisible();

  const overflow = await page.evaluate(() => ({
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);

  await testInfo.attach(options.screenshot, {
    body: await page.screenshot({ fullPage: true, caret: "initial" }),
    contentType: "image/png",
  });
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
