import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { prepareDemoWorkspace } from "../helpers/demo-workspace";
import { completeCompanyOnboarding } from "../helpers/onboarding";

test.describe("project workspace navigation", () => {
  test("architecture exposes focused areas and protects diary photos", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One desktop browser is resized across every reference viewport.",
    );
    test.setTimeout(210_000);

    const suffix = crypto.randomUUID();
    const email = `project-workspace-architecture-${suffix}@prumo.test`;
    const password = "Prumo-E2E-Workspace-Architecture-2026!";
    const browserErrors = collectBrowserErrors(page);

    try {
      const projectUrl = await createWorkspaceWithDemoProject({
        page,
        email,
        password,
        profile: "Arquitetura",
      });

      await test.step("use every area from a narrow phone", async () => {
        await openProjectAtViewport(page, projectUrl, 375, 812);
        const areaSelect = page.getByLabel("Área do projeto");

        await expect(areaSelect).toHaveValue("resumo");
        await expect(areaSelect.locator("option")).toHaveCount(6);
        await expect(
          page.locator("#project-workspace-view"),
        ).toHaveAttribute("aria-label", "Resumo");
        await assertNoHorizontalOverflow(page);
        await attachScreenshot(
          page,
          testInfo,
          "workspace-architecture-summary-375x812",
        );

        for (const view of [
          "briefing",
          "ambientes",
          "etapas",
          "entregas",
          "gestao",
        ]) {
          await areaSelect.selectOption(view);
          await expect(page).toHaveURL(
            new RegExp(`[?&]view=${view}(?:&|$|#)`),
          );
          await expect(areaSelect).toHaveValue(view);
          await expect(page.locator("#project-workspace-view")).toBeVisible();
          await assertNoHorizontalOverflow(page);
        }
      });

      await test.step("restore text and block area changes with pending photos", async () => {
        const diary = page.getByPlaceholder("O que rolou hoje? (opcional)");
        await diary.fill("Rascunho de acompanhamento preservado no aparelho.");

        const photoInput = page.locator(
          'input[type="file"][accept*="image/jpeg"]',
        );
        await photoInput.setInputFiles({
          name: "registro-qa.png",
          mimeType: "image/png",
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "base64",
          ),
        });
        await expect(page.getByRole("button", { name: "Remover foto" })).toBeVisible();

        const areaSelect = page.getByLabel("Área do projeto");
        await areaSelect.selectOption("resumo");
        const protectionDialog = page.getByRole("dialog", {
          name: "Alterações ainda não foram salvas",
        });
        await expect(protectionDialog).toBeVisible();
        await protectionDialog
          .getByRole("button", { name: "Continuar editando" })
          .click();
        await expect(areaSelect).toHaveValue("gestao");
        await expect(diary).toHaveValue(
          "Rascunho de acompanhamento preservado no aparelho.",
        );

        await page.getByRole("button", { name: "Remover foto" }).click();
        await areaSelect.selectOption("resumo");
        await expect(page).toHaveURL(/[?&]view=resumo(?:&|$|#)/);

        await page.getByLabel("Área do projeto").selectOption("gestao");
        await expect(
          page.getByPlaceholder("O que rolou hoje? (opcional)"),
        ).toHaveValue(
          "Rascunho de acompanhamento preservado no aparelho.",
        );
        await expect(
          page.getByText("Rascunho de texto restaurado neste aparelho."),
        ).toBeVisible();
        await attachScreenshot(
          page,
          testInfo,
          "workspace-diary-restored-375x812",
        );
      });

      await test.step("support desktop history, direct URLs and legacy hashes", async () => {
        await openProjectAtViewport(page, projectUrl, 1440, 900);
        const navigation = page.getByRole("navigation", {
          name: "Áreas do projeto",
        });
        await expect(navigation.getByRole("link")).toHaveCount(6);
        await expect(
          navigation.getByRole("link", { name: "Resumo", exact: true }),
        ).toHaveAttribute("aria-current", "page");

        await navigation
          .getByRole("link", { name: "Entregas", exact: true })
          .click();
        await expect(page).toHaveURL(/[?&]view=entregas(?:&|$|#)/);
        await expect(
          page.locator("#project-workspace-view"),
        ).toHaveAttribute("aria-label", "Entregas");

        await page.goBack();
        await expect(
          page.locator("#project-workspace-view"),
        ).toHaveAttribute("aria-label", "Resumo");

        await page.goto(`${projectUrl}#briefing`);
        await expect(page).toHaveURL(/[?&]view=briefing(?:&|$)/);
        await expect(
          page.locator("#project-workspace-view"),
        ).toHaveAttribute("aria-label", "Briefing");

        await page.goto(`${projectUrl}?view=desconhecida`);
        await expect(
          page.locator("#project-workspace-view"),
        ).toHaveAttribute("aria-label", "Resumo");
        await assertNoHorizontalOverflow(page);
        await attachScreenshot(
          page,
          testInfo,
          "workspace-architecture-desktop-1440x900",
        );
      });

      await test.step("open management from billing attention without real demo charges", async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${projectUrl}?cobranca=atencao`);
        await expect(page.getByLabel("Área do projeto")).toHaveValue("gestao");
        await expect(page.locator("#cobranca")).toBeVisible();
        await expect(
          page.getByText(
            "Nenhuma cobrança real pode ser criada neste ambiente.",
            { exact: false },
          ),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /Gerar Pix/i }),
        ).toHaveCount(0);
        await assertNoHorizontalOverflow(page);
      });

      expect(browserErrors).toEqual([]);
    } finally {
      await cleanupAccount(email);
    }
  });

  test("construction keeps the reduced four-area workspace", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One desktop browser is resized across every reference viewport.",
    );
    test.setTimeout(150_000);

    const suffix = crypto.randomUUID();
    const email = `project-workspace-construction-${suffix}@prumo.test`;
    const password = "Prumo-E2E-Workspace-Construction-2026!";
    const browserErrors = collectBrowserErrors(page);

    try {
      const projectUrl = await createWorkspaceWithDemoProject({
        page,
        email,
        password,
        profile: "Obras",
      });

      await openProjectAtViewport(page, projectUrl, 390, 844);
      const areaSelect = page.getByLabel("Área do projeto");
      await expect(areaSelect.locator("option")).toHaveCount(4);
      await expect(
        areaSelect.locator('option[value="briefing"]'),
      ).toHaveCount(0);
      await expect(
        areaSelect.locator('option[value="ambientes"]'),
      ).toHaveCount(0);

      await page.goto(`${projectUrl}?view=briefing`);
      await expect(page.getByLabel("Área do projeto")).toHaveValue("resumo");
      await expect(
        page.locator("#project-workspace-view"),
      ).toHaveAttribute("aria-label", "Resumo");

      await page.goto(`${projectUrl}#cobranca`);
      await expect(page).toHaveURL(/[?&]view=gestao#cobranca$/);
      await expect(page.locator("#cobranca")).toBeVisible();

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(projectUrl);
      const navigation = page.getByRole("navigation", {
        name: "Áreas do projeto",
      });
      await expect(navigation.getByRole("link")).toHaveCount(4);
      await expect(
        navigation.getByRole("link", { name: "Briefing", exact: true }),
      ).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(
        page,
        testInfo,
        "workspace-construction-desktop-1440x900",
      );

      expect(browserErrors).toEqual([]);
    } finally {
      await cleanupAccount(email);
    }
  });
});

async function createWorkspaceWithDemoProject({
  page,
  email,
  password,
  profile,
}: {
  page: Page;
  email: string;
  password: string;
  profile: "Arquitetura" | "Obras";
}) {
  await page.goto("/signup");
  await page.getByLabel("Seu nome").fill("Responsável Workspace QA");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await completeCompanyOnboarding(page, `Prumo QA Workspace ${profile}`, {
    profile,
  });

  await prepareDemoWorkspace(page, email);

  await page.goto("/app/obras");
  const projectLink = page.getByRole("link", {
    name:
      profile === "Arquitetura"
        ? /Abrir projeto Demo/
        : /Abrir obra Demo/,
  });
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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mudar status" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Áreas do projeto" }),
  ).toBeVisible();
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
