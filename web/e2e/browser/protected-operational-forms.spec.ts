import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test("operational forms protect and persist user input", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "A single desktop context covers the reference mobile viewports.",
  );
  test.setTimeout(180_000);

  const suffix = crypto.randomUUID();
  const shortId = suffix.slice(0, 8);
  const email = `protected-forms-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Forms-2026!";
  const modelName = `Modelo QA ${shortId}`;
  const stageName = `Acabamento QA ${shortId}`;
  const costDescription = `Cimento QA ${shortId}`;
  const workerName = `Profissional QA ${shortId}`;
  const browserErrors = collectBrowserErrors(page);

  try {
    const projectUrl = await createWorkspaceWithDemoProject(
      page,
      email,
      password,
    );

    await test.step("protect and save a stage model on mobile", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/app/configuracoes/templates");
      await page.getByRole("button", { name: "Novo modelo" }).click();

      await page.getByLabel("Nome do modelo").fill(modelName);
      await page.locator('input[id^="template-item-name-"]').fill("Preparação");
      await page.locator('input[id^="template-item-days-"]').fill("3");
      await expect(page.getByText("Alterações não salvas")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "template-dirty-390x844");

      await page.getByRole("button", { name: "Cancelar" }).click();
      const discardDialog = page.getByRole("dialog", {
        name: "Descartar alterações?",
      });
      await expect(discardDialog).toBeVisible();
      await discardDialog
        .getByRole("button", { name: "Continuar editando" })
        .click();
      await expect(page.getByLabel("Nome do modelo")).toHaveValue(modelName);

      await page.getByRole("button", { name: "Salvar modelo" }).click();
      await expect(page.getByText(modelName, { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByText(modelName, { exact: true })).toBeVisible();
    });

    await test.step("protect and create a project stage", async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(projectUrl);
      await page.getByRole("button", { name: "Adicionar etapa" }).first().click();
      await page.getByLabel("Nome da etapa").fill(stageName);
      await page.getByLabel(/Dias previstos/).fill("4");

      await page.getByRole("button", { name: "Cancelar" }).click();
      const discardDialog = page.getByRole("dialog", {
        name: "Descartar alterações?",
      });
      await discardDialog
        .getByRole("button", { name: "Continuar editando" })
        .click();
      await expect(page.getByLabel("Nome da etapa")).toHaveValue(stageName);

      await page.getByRole("button", { name: "Adicionar etapa" }).last().click();
      await expect(page.getByText(stageName, { exact: true })).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });

    await test.step("validate, protect and save a project cost", async () => {
      await page
        .getByLabel("Ir para uma seção da obra")
        .selectOption("custos");
      await page.getByRole("button", { name: "Lançar gasto" }).click();

      const costDialog = page.getByRole("dialog", { name: "Lançar gasto" });
      await costDialog.getByRole("button", { name: "Lançar gasto" }).click();
      await expect(costDialog.getByLabel("Descrição")).toBeFocused();
      await expect(
        costDialog.getByText("Informe a descrição."),
      ).toBeVisible();

      await costDialog.getByLabel("Descrição").fill(costDescription);
      await costDialog.getByLabel("Valor (R$)").fill("1234.56");
      await costDialog.getByRole("button", { name: "Cancelar" }).click();
      const discardDialog = page.getByRole("dialog", {
        name: "Descartar alterações?",
      });
      await discardDialog
        .getByRole("button", { name: "Continuar editando" })
        .click();
      await expect(costDialog.getByLabel("Descrição")).toHaveValue(
        costDescription,
      );
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "cost-protected-375x812");

      await costDialog.getByRole("button", { name: "Lançar gasto" }).click();
      await page
        .getByRole("button", { name: /Ver \d+ lançamentos/ })
        .click();
      await expect(page.getByText(costDescription, { exact: true })).toBeVisible();
      await expect(page.getByText("R$ 1.234,56").first()).toBeVisible();
    });

    await test.step("validate, protect and save a time entry", async () => {
      await page
        .getByLabel("Ir para uma seção da obra")
        .selectOption("equipe");
      await page.getByRole("button", { name: "Bater ponto" }).click();

      const timeDialog = page.getByRole("dialog", { name: "Registrar ponto" });
      await timeDialog.getByRole("button", { name: "Registrar ponto" }).click();
      await expect(timeDialog.getByLabel("Nome do profissional")).toBeFocused();
      await expect(
        timeDialog.getByText("Informe o nome do profissional."),
      ).toBeVisible();

      await timeDialog.getByLabel("Nome do profissional").fill(workerName);
      await timeDialog
        .getByRole("button", { name: "Fechar", exact: true })
        .first()
        .click();
      const discardDialog = page.getByRole("dialog", {
        name: "Descartar alterações?",
      });
      await discardDialog
        .getByRole("button", { name: "Continuar editando" })
        .click();
      await expect(timeDialog.getByLabel("Nome do profissional")).toHaveValue(
        workerName,
      );
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "time-protected-375x812");

      await timeDialog.getByRole("button", { name: "Registrar ponto" }).click();
      await expect(
        timeDialog.getByText(/Ponto registrado/),
      ).toBeVisible();
      await expect(page.getByText(workerName, { exact: true })).toBeVisible();
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
  await page.getByLabel("Seu nome").fill("Responsável Formulários QA");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel(/Nome da empresa/).fill("Prumo QA Formulários Protegidos");
  await page.getByLabel("Telefone comercial").fill("11999990000");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/app(?:\?|$)/, { timeout: 30_000 });

  await page.getByRole("button", { name: "Explorar com exemplo" }).click();
  await expect(page).toHaveURL(/\/app\/orcamentos\/[0-9a-f-]+$/, {
    timeout: 30_000,
  });

  await page.goto("/app/obras");
  const projectLink = page.getByRole("link", { name: /Abrir obra Demo/ });
  await expect(projectLink).toBeVisible();
  const projectUrl = await projectLink.getAttribute("href");
  expect(projectUrl).toMatch(/^\/app\/obras\/[0-9a-f-]+$/);
  return projectUrl!;
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
