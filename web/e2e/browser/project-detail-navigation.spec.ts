import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test("project detail navigation reaches every operational section", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "A single desktop context covers every reference viewport.",
  );
  test.setTimeout(150_000);

  const suffix = crypto.randomUUID();
  const email = `project-detail-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Project-2026!";
  const browserErrors = collectBrowserErrors(page);

  try {
    const projectUrl = await createWorkspaceWithDemoProject(
      page,
      email,
      password,
    );

    await test.step("navigate to billing on a narrow phone", async () => {
      await openProjectAtViewport(page, projectUrl, 375, 812);
      await attachScreenshot(page, testInfo, "project-top-375x812");
      await page
        .getByLabel("Ir para uma se\u00e7\u00e3o da obra")
        .selectOption("cobranca");

      await expect(page).toHaveURL(/#cobranca$/);
      await expect(page.locator("#cobranca")).toBeFocused();
      await expect(page.locator("#cobranca")).toBeInViewport({ ratio: 0.1 });
      await assertSectionNavigationVisible(page, 375);
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "project-billing-375x812");
    });

    await test.step("preserve query parameters while opening the diary", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${projectUrl}?cobranca=atencao#cobranca`);
      await expect(
        page.getByRole("heading", {
          name: "Demo - Execu\u00e7\u00e3o cobertura Maria Santos",
          level: 1,
        }),
      ).toBeVisible();
      const sectionSelect = page.getByLabel(
        "Ir para uma se\u00e7\u00e3o da obra",
      );
      await expect(sectionSelect).toHaveValue("cobranca");
      await sectionSelect.selectOption("diario");

      await expect(page).toHaveURL(/\?cobranca=atencao#diario$/);
      await expect(page.locator("#diario")).toBeFocused();
      await expect(page.locator("#diario")).toBeInViewport({ ratio: 0.1 });
      await assertSectionNavigationVisible(page, 390);
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "project-diary-390x844");
    });

    await test.step("reach the team section on tablet", async () => {
      await openProjectAtViewport(page, projectUrl, 768, 1024);
      await page
        .getByLabel("Ir para uma se\u00e7\u00e3o da obra")
        .selectOption("equipe");

      await expect(page).toHaveURL(/#equipe$/);
      await expect(page.locator("#equipe")).toBeFocused();
      await expect(page.locator("#equipe")).toBeInViewport({ ratio: 0.1 });
      await assertSectionNavigationVisible(page, 768);
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "project-team-768x1024");
    });

    await test.step("use desktop links and expose the active destination", async () => {
      await openProjectAtViewport(page, projectUrl, 1440, 900);
      await attachScreenshot(page, testInfo, "project-top-1440x900");
      const costsLink = page.getByRole("link", { name: "Custos", exact: true });
      await expect(costsLink).toBeVisible();
      await costsLink.click();

      await expect(page).toHaveURL(/#custos$/);
      await expect(page.locator("#custos")).toBeFocused();
      await expect(page.locator("#custos")).toBeInViewport({ ratio: 0.1 });
      await expect(costsLink).toHaveAttribute("aria-current", "location");
      await assertSectionNavigationVisible(page, 1440);
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "project-costs-1440x900");
    });

    expect(browserErrors).toEqual([]);
  } finally {
    await cleanupAccount(email);
  }
});

async function createWorkspaceWithDemoProject(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/signup");
  await page.getByLabel("Seu nome").fill("Responsavel Detalhe Obra");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel(/Nome da empresa/).fill("Prumo QA Detalhe Obra");
  await page.getByLabel("Telefone comercial").fill("11999990000");
  await page.getByLabel("Cidade").fill("Sao Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/app(?:\?|$)/);

  await page.getByRole("button", { name: "Explorar com exemplo" }).click();
  await expect(page).toHaveURL(/\/app\/orcamentos\/[0-9a-f-]+$/);

  await page.goto("/app/obras");
  const projectLink = page.getByRole("link", { name: /Abrir obra Demo/ });
  await expect(projectLink).toBeVisible();
  const projectUrl = await projectLink.getAttribute("href");
  expect(projectUrl).toMatch(/^\/app\/obras\/[0-9a-f-]+$/);
  return projectUrl!;
}

async function openProjectAtViewport(
  page: Page,
  projectUrl: string,
  width: number,
  height: number,
) {
  await page.setViewportSize({ width, height });
  await page.goto(projectUrl);
  await expect(
    page.getByRole("heading", {
      name: "Demo - Execu\u00e7\u00e3o cobertura Maria Santos",
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Mudar status" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
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

async function assertSectionNavigationVisible(page: Page, width: number) {
  const navigation = page.getByRole("navigation", {
    name: "Se\u00e7\u00f5es da obra",
  });
  await expect(navigation).toBeInViewport({ ratio: 1 });

  const navigationBox = await navigation.boundingBox();
  expect(navigationBox).not.toBeNull();
  if (!navigationBox) return;

  if (width >= 1024) {
    expect(navigationBox.y).toBeGreaterThanOrEqual(8);
    expect(navigationBox.y).toBeLessThanOrEqual(20);
    return;
  }

  const topbarBox = await page.locator("header").first().boundingBox();
  expect(topbarBox).not.toBeNull();
  if (!topbarBox) return;
  expect(navigationBox.y).toBeGreaterThanOrEqual(
    Math.floor(topbarBox.y + topbarBox.height - 1),
  );
  expect(navigationBox.y).toBeLessThanOrEqual(
    Math.ceil(topbarBox.y + topbarBox.height + 2),
  );
}

async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  await testInfo.attach(name, {
    body: await page.screenshot({ caret: "initial" }),
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
