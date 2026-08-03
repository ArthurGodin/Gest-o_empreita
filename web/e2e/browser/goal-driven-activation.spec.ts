import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { completeCompanyOnboarding } from "../helpers/onboarding";

test("architect activates Prumo through a direct project and public briefing", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(180_000);

  const suffix = crypto.randomUUID();
  const email = `activation-${testInfo.project.name}-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Activation-2026!";
  const projectName = `Residência QA ${suffix.slice(0, 8)}`;
  const browserErrors = collectBrowserErrors(page);

  try {
    await test.step("choose a useful first outcome", async () => {
      await page.goto("/signup");
      await page.getByLabel("Seu nome").fill("Arquiteta QA");
      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha").fill(password);
      await page.getByRole("button", { name: "Criar minha conta" }).click();
      await expect(page).toHaveURL(/\/onboarding/);

      await completeCompanyOnboarding(page, "Estúdio Prumo QA", {
        profile: "Arquitetura",
        goal: "client_briefing",
      });

      await expect(
        page.getByRole("heading", { name: "Briefing pronto para o cliente" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Cadastrar trabalho" }),
      ).toBeVisible();
    });

    await test.step("create the customer and contracted project together", async () => {
      await page.getByRole("link", { name: "Cadastrar trabalho" }).click();
      await expect(page).toHaveURL(/\/app\/obras\/novo\?goal=client_briefing/);

      await page.getByLabel("Nome do cliente").fill("Cliente Briefing QA");
      await page.getByLabel("WhatsApp").fill("11988887777");
      await page.getByLabel("Nome do projeto").fill(projectName);

      await testInfo.attach("direct-project-form", {
        body: await page.screenshot({ fullPage: true, caret: "initial" }),
        contentType: "image/png",
      });

      await page.getByRole("button", { name: "Cadastrar projeto" }).click();
      await expect(page).toHaveURL(
        /\/app\/obras\/[0-9a-f-]+\?view=briefing$/,
        { timeout: 20_000 },
      );
      await expect(page.getByText(projectName, { exact: true }).first()).toBeVisible();
    });

    let publicUrl = "";
    await test.step("create and share the briefing", async () => {
      await page.getByRole("button", { name: "Criar briefing" }).click();
      const dialog = page.getByRole("dialog", { name: "Escolha o briefing" });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="briefing-template"]').first().check();
      await dialog.getByRole("button", { name: "Criar briefing" }).click();

      const shareButton = page.getByRole("button", { name: "Compartilhar" });
      await expect(shareButton).toBeVisible({ timeout: 20_000 });
      await shareButton.click();
      await expect(page.getByRole("button", { name: "Copiar link" })).toBeVisible({
        timeout: 20_000,
      });

      const whatsappLink = page.getByRole("link", {
        name: "Enviar pelo WhatsApp",
      });
      await expect(whatsappLink).toBeVisible();
      const whatsappUrl = new URL((await whatsappLink.getAttribute("href")) ?? "");
      const message = whatsappUrl.searchParams.get("text") ?? "";
      publicUrl = message.match(/https?:\/\/\S+\/p\/[A-Za-z0-9_-]{32,}/)?.[0] ?? "";
      expect(publicUrl).toMatch(/\/p\/[A-Za-z0-9_-]{32,}/);
    });

    await test.step("keep the direct public view isolated", async () => {
      const publicContext = await browser.newContext({
        viewport: testInfo.project.name.startsWith("mobile")
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
      });
      try {
        const publicPage = await publicContext.newPage();
        const publicErrors = collectBrowserErrors(publicPage);
        await publicPage.goto(publicUrl);

        await expect(
          publicPage.getByRole("heading", { name: "Briefing do projeto" }),
        ).toBeVisible();
        await expect(publicPage.getByText(projectName, { exact: true })).toBeVisible();
        await expect(publicPage.getByText(/Valor contratado/i)).toHaveCount(0);
        await expect(publicPage.getByText(/Cobrança/i)).toHaveCount(0);
        await expect(publicPage.getByText(/Custo/i)).toHaveCount(0);

        const overflow = await publicPage.evaluate(() =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
        expect(publicErrors).toEqual([]);

        await testInfo.attach("public-direct-briefing", {
          body: await publicPage.screenshot({ fullPage: true, caret: "initial" }),
          contentType: "image/png",
        });
      } finally {
        await publicContext.close();
      }
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
