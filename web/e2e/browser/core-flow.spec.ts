import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { completeCompanyOnboarding } from "../helpers/onboarding";

test("owner completes the core journey and simulated checkout", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(180_000);

  const suffix = crypto.randomUUID();
  const email = `journey-${testInfo.project.name}-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Journey-2026!";
  const companyName = `Prumo QA ${testInfo.project.name}`;
  const customerName = `Cliente QA ${suffix.slice(0, 8)}`;
  const quoteTitle = `Reforma QA ${suffix.slice(0, 8)}`;
  const browserErrors = collectBrowserErrors(page);

  try {
    await test.step("create account and company", async () => {
      await page.goto("/signup");
      await page.getByLabel("Seu nome").fill("Responsavel QA");
      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha").fill(password);
      await page.getByRole("button", { name: "Criar minha conta" }).click();
      await expect(page).toHaveURL(/\/onboarding/);

      await completeCompanyOnboarding(page, companyName);
      await expect(
        page.getByRole("heading", { name: "Caminho até a primeira venda" }),
      ).toBeVisible();
      await expect(page.getByText(/próximo: Cliente/i)).toBeVisible();
    });

    await test.step("create customer through the app", async () => {
      await page.goto("/app/clientes/novo");
      await page.locator("#name").fill(customerName);
      await page.locator("#phone").fill("11988887777");
      await page.locator("#document").fill("10714206075");
      await page.locator("#address").fill("Rua QA, 100");
      await page.getByRole("button", { name: "Cadastrar cliente" }).click();
      await expect(page).toHaveURL(/\/app\/clientes\/[0-9a-f-]+$/);

      await page.goto("/app");
      await expect(page.getByText(/próximo: Orçamento/i)).toBeVisible();
    });

    let quoteUrl = "";
    let shareUrl = "";
    let quoteId = "";
    let companyId = "";
    await test.step("create, price and send a quote", async () => {
      await page.goto("/app/orcamentos/novo");
      await page.locator("#customer").selectOption({ label: customerName });
      await page.getByLabel(/T.tulo do or.amento/).fill(quoteTitle);
      await page.getByRole("button", { name: /Criar or.amento/ }).click();
      await expect(page).toHaveURL(/\/app\/orcamentos\/[0-9a-f-]+$/);
      quoteUrl = page.url();
      quoteId = new URL(quoteUrl).pathname.split("/").at(-1) ?? "";

      await page.locator('input[id^="description-"]').fill("Servico de reforma");
      await page.locator('input[id^="qty-"]').fill("2");
      await page.locator('input[id^="unit-"]').fill("un");
      await page.locator('input[id^="price-"]').fill("500,00");
      await page.locator('input[id^="price-"]').blur();

      const sendButton = page.getByRole("button", {
        name: /Salvar e enviar no WhatsApp|Enviar WhatsApp/,
      });
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByText(/Enviar or.amento pelo WhatsApp/),
      ).toBeVisible();
      const linkInput = dialog.locator('input[readonly][value*="/q/"]');
      shareUrl = await linkInput.inputValue();
      expect(shareUrl).toMatch(/\/q\/[A-Za-z0-9_-]{32,}/);

      const admin = adminClient();
      const { data: quoteRecord, error: quoteRecordError } = await admin
        .from("quotes")
        .select("company_id")
        .eq("id", quoteId)
        .single();
      expect(quoteRecordError).toBeNull();
      companyId = quoteRecord?.company_id ?? "";

      await page.goto("/app");
      await expect(page.getByText(/próximo: Aprovação/i)).toBeVisible();
    });

    await test.step("customer approves from the public link", async () => {
      const publicContext = await browser.newContext();
      try {
        const publicPage = await publicContext.newPage();
        const publicErrors = collectBrowserErrors(publicPage);

        await publicPage.goto(shareUrl);
        const publicHtml = await publicPage.content();
        expect(publicHtml).not.toContain(quoteId);
        expect(publicHtml).not.toContain(companyId);
        expect(publicHtml).not.toContain("company_id");
        expect(publicHtml).not.toContain("project_id");
        await publicPage
          .getByLabel("Seu nome completo")
          .fill("Cliente Aprovador QA");
        await publicPage
          .getByRole("button", { name: /Aprovar or.amento agora/ })
          .click();
        await expect(publicPage).toHaveURL(/\/aprovado$/);
        await expect(
          publicPage.getByRole("heading", {
            name: /Or.amento aprovado com sucesso/,
          }),
        ).toBeVisible();
        expect(publicErrors).toEqual([]);
      } finally {
        await publicContext.close();
      }
    });

    await test.step("turn the approved quote into a project", async () => {
      await page.goto(quoteUrl);
      const convertButton = page.getByRole("button", { name: "Virar obra" });
      await expect(convertButton).toBeVisible();
      await convertButton.click();

      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Entrada agora (%)").fill("0");
      await dialog.getByRole("button", { name: "Confirmar e criar obra" }).click();
      await expect(page).toHaveURL(/\/app\/obras\/[0-9a-f-]+/, {
        timeout: 20_000,
      });
      await expect(page.getByText(quoteTitle, { exact: true }).first()).toBeVisible();
    });

    await test.step("exercise local checkout without external billing", async () => {
      await page.goto("/app/configuracoes/plano/checkout?plan=pro");
      await expect(page.getByText("Modo simulado local ativo")).toBeVisible();
      await page
        .getByRole("button", { name: "Ir para pagamento seguro" })
        .click();
      await expect(page).toHaveURL(/\/app\/configuracoes\/plano$/);
      await expect(page.getByText(/Plano atual: Plano Pro/)).toBeVisible();
    });

    await test.step("settings and sign out remain reachable", async () => {
      await page.goto("/app/configuracoes");
      await expect(
        page.getByRole("heading", { name: /Configura..es/ }),
      ).toBeVisible();
      await testInfo.attach("app-settings", {
        body: await page.screenshot({ fullPage: true, caret: "initial" }),
        contentType: "image/png",
      });

      if (testInfo.project.name.startsWith("mobile")) {
        await page.getByLabel("Abrir menu da conta").click();
        await page.getByRole("menuitem", { name: "Sair da conta" }).click();
      } else {
        await page.getByRole("button", { name: "Sair", exact: true }).click();
      }
      await expect(page).toHaveURL(/\/$/);
    });

    expect(browserErrors).toEqual([]);
  } finally {
    await cleanupAccount(email);
  }
});

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
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
