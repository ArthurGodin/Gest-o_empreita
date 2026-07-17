import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test("quote editor protects explicit draft saving", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "A single desktop context covers every reference viewport.",
  );
  test.setTimeout(180_000);

  const suffix = crypto.randomUUID();
  const email = `quote-editor-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Quote-2026!";
  const customerName = `Cliente Editor ${suffix.slice(0, 8)}`;
  const browserErrors = collectBrowserErrors(page);

  try {
    await createWorkspaceAndCustomer(page, email, password, customerName);
    const quoteUrl = await createEmptyQuote(page, customerName);

    await test.step("save an incomplete draft explicitly on mobile", async () => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(quoteUrl);
      await expect(page.getByText("Rascunho salvo")).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const title = page.getByLabel("Título");
      await title.fill("Rascunho protegido QA");
      await expect(page.getByText("Alterações não salvas")).toBeVisible();
      await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeEnabled();
      await attachScreenshot(page, testInfo, "quote-dirty-375x812");

      await page.getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(page.getByText(/Salvo às \d{2}:\d{2}/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();

      await page.reload();
      await expect(title).toHaveValue("Rascunho protegido QA");
      await expect(page.getByText("Rascunho salvo")).toBeVisible();
    });

    await test.step("focus inline errors for a partial item", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const quantity = page.locator('input[id^="qty-"]').first();
      await quantity.fill("2");
      await expect(page.getByText("Alterações não salvas")).toBeVisible();
      await page.getByRole("button", { name: "Salvar", exact: true }).click();

      const description = page.locator('input[id^="description-"]').first();
      await expect(page.getByText("Descreva este item ou remova a linha.")).toBeVisible();
      await expect(description).toBeFocused();
      await expect(description).toBeInViewport();
      await attachScreenshot(page, testInfo, "quote-error-390x844");

      await description.fill("Serviço de revisão");
      const price = page.locator('input[id^="price-"]').first();
      await price.fill("125,00");
      await price.blur();
      await page.getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(page.getByText(/Salvo às \d{2}:\d{2}/)).toBeVisible();
      await expect(page.getByText("R$ 250,00").first()).toBeVisible();
      await attachScreenshot(page, testInfo, "quote-item-390x844");
    });

    await test.step("reorder, remove and undo items", async () => {
      await page.getByRole("button", { name: "Adicionar item" }).click();

      const descriptions = page.locator('input[id^="description-"]');
      await descriptions.nth(1).fill("Materiais complementares");
      const prices = page.locator('input[id^="price-"]');
      await prices.nth(1).fill("50,00");
      await prices.nth(1).blur();

      const moveUp = page.getByRole("button", { name: "Mover pra cima" });
      await moveUp.nth(1).click();
      await expect(descriptions.first()).toHaveValue("Materiais complementares");

      await page.getByRole("button", { name: "Remover item" }).first().click();
      await expect(page.getByText(/Item removido:/)).toBeVisible();
      await page.getByRole("button", { name: "Desfazer" }).click();
      await expect(descriptions.first()).toHaveValue("Materiais complementares");

      await page.getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(page.getByText(/Salvo às \d{2}:\d{2}/)).toBeVisible();
    });

    await test.step("cancel internal navigation with unsaved changes", async () => {
      await page.getByLabel("Título").fill("Mudança ainda não salva");
      await page.getByRole("link", { name: "Clientes", exact: true }).click();

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", {
          name: "Alterações ainda não foram salvas",
        }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Continuar editando" }).click();
      await expect(page).toHaveURL(quoteUrl);
      await expect(page.getByLabel("Título")).toHaveValue(
        "Mudança ainda não salva",
      );
    });

    await test.step("protect browser history and allow confirmed exit", async () => {
      const dialogHandled = new Promise<void>((resolve) => {
        page.once("dialog", async (dialog) => {
          expect(["beforeunload", "confirm"]).toContain(dialog.type());
          await dialog.dismiss();
          resolve();
        });
      });
      await page.evaluate(() => window.history.back());
      await dialogHandled;
      await expect(page).toHaveURL(quoteUrl);

      await page.getByRole("link", { name: "Clientes", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Sair sem salvar" })
        .click();
      await expect(page).toHaveURL(/\/app\/clientes$/);
    });

    await test.step("remain responsive at tablet and desktop widths", async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(quoteUrl);
      await expect(page.getByLabel("Título")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "quote-editor-768x1024");

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(quoteUrl);
      await expect(page.getByLabel("Título")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await attachScreenshot(page, testInfo, "quote-editor-1440x900");
    });

    expect(browserErrors).toEqual([]);
  } finally {
    await cleanupAccount(email);
  }
});

async function createWorkspaceAndCustomer(
  page: Page,
  email: string,
  password: string,
  customerName: string,
) {
  await page.goto("/signup");
  await page.getByLabel("Seu nome").fill("Responsável Editor QA");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel(/Nome da empresa/).fill("Prumo QA Editor Protegido");
  await page.getByLabel("Telefone comercial").fill("11999990000");
  await page.getByLabel("Cidade").fill("São Paulo");
  await page.getByLabel("UF").fill("SP");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/app(?:\?|$)/);

  await page.goto("/app/clientes/novo");
  await page.locator("#name").fill(customerName);
  await page.locator("#phone").fill("11988887777");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[0-9a-f-]+$/);
}

async function createEmptyQuote(page: Page, customerName: string) {
  await page.goto("/app/orcamentos/novo");
  await page.locator("#customer").selectOption({ label: customerName });
  await page.getByLabel("Título do orçamento").fill("Editor protegido inicial");
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await expect(page).toHaveURL(/\/app\/orcamentos\/[0-9a-f-]+$/);
  return page.url();
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
