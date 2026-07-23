import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { completeCompanyOnboarding } from "../helpers/onboarding";

test("versioned deliverables protect the client review and final acceptance flow", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "One browser covers the mobile and desktop reference viewports.",
  );
  test.setTimeout(180_000);

  const suffix = crypto.randomUUID();
  const email = `deliverables-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Deliverables-2026!";
  const browserErrors = collectBrowserErrors(page);

  try {
    await createWorkspace(page, email, password);
    const fixture = await seedProject(email, suffix);

    await test.step("the team creates and publishes version 1 on mobile", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/app/obras/${fixture.projectId}#entregas`);
      await page
        .getByRole("combobox", { name: /Ir para uma/ })
        .selectOption("entregas");

      const section = page.locator("#entregas");
      await expect(
        section.getByRole("heading", { name: /Materiais para/ }),
      ).toBeVisible();
      await section.getByRole("button", { name: "Adicionar entrega" }).click();

      await page.locator("#deliverable-title").fill("Anteprojeto residencial");
      await page
        .getByRole("button", { name: "Link", exact: true })
        .click();
      await page
        .locator("#deliverable-link")
        .fill("https://example.com/anteprojeto-v1");
      await page
        .locator("#deliverable-note")
        .fill("Primeira versao para validacao do cliente.");
      await page.getByRole("button", { name: "Criar rascunho" }).click();

      await expect(
        section.getByRole("button", { name: "Publicar v1" }),
      ).toBeVisible();
      await section.getByRole("button", { name: "Publicar v1" }).click();
      await page
        .getByRole("button", { name: "Publicar para o cliente" })
        .click();

      await expect(
        section.getByText("Cliente ainda", { exact: false }),
      ).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await testInfo.attach("deliverables-internal-mobile-v1", {
        body: await page.screenshot({ fullPage: true, caret: "initial" }),
        contentType: "image/png",
      });
    });

    await test.step("the client requests changes without logging in", async () => {
      await page.goto(`/q/${fixture.shareToken}?tab=entregas`);
      await expect(page.getByRole("tab")).toHaveCount(4);
      await expect(
        page.getByRole("heading", { name: "Anteprojeto residencial" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Pedir ajustes" }).click();
      await page.getByLabel("Seu nome").fill("Cliente QA");
      await page
        .getByLabel("O que precisa mudar?")
        .fill("Ajustar a posicao da bancada e revisar as cotas da cozinha.");
      await page
        .getByRole("button", { name: "Enviar pedido de ajustes" })
        .click();

      await expect(page.getByText("Ajustes solicitados por Cliente QA")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await testInfo.attach("deliverables-public-mobile-changes", {
        body: await page.screenshot({ fullPage: true, caret: "initial" }),
        contentType: "image/png",
      });
    });

    await test.step("the team publishes version 2 with the requested change", async () => {
      await page.goto(`/app/obras/${fixture.projectId}#entregas`);
      const section = page.locator("#entregas");

      await expect(
        section.getByText("Ajustes pedidos por Cliente QA"),
      ).toBeVisible();
      await section
        .getByRole("button", { name: "Criar nova vers", exact: false })
        .click();

      await page
        .getByRole("button", { name: "Link", exact: true })
        .click();
      await page
        .locator("#deliverable-link")
        .fill("https://example.com/anteprojeto-v2");
      await page
        .locator("#deliverable-note")
        .fill("Bancada reposicionada e cotas da cozinha revisadas.");
      await page
        .getByRole("button", { name: "Criar vers", exact: false })
        .click();

      await expect(
        section.getByRole("button", { name: "Publicar v2" }),
      ).toBeVisible();
      await section.getByRole("button", { name: "Publicar v2" }).click();
      await page
        .getByRole("button", { name: "Publicar para o cliente" })
        .click();

      await expect(
        section.getByRole("link", { name: "Abrir vers", exact: false }),
      ).toBeVisible();
    });

    await test.step("the client approves version 2 and the project is completed", async () => {
      await page.goto(`/q/${fixture.shareToken}?tab=entregas`);
      await expect(page.getByText(/Vers.o 2/, { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: "Aprovar vers", exact: false })
        .click();
      await page.getByLabel("Seu nome").fill("Cliente QA");
      await page.getByRole("checkbox").check();
      await page
        .getByRole("button", { name: "Confirmar aprova", exact: false })
        .click();
      await expect(page.getByText("Aprovada por Cliente QA")).toBeVisible();

      const { error } = await adminClient()
        .from("projects")
        .update({ status: "completed" })
        .eq("id", fixture.projectId);
      expect(error).toBeNull();
    });

    await test.step("final acceptance releases only the approved balance", async () => {
      await page.goto(`/q/${fixture.shareToken}?tab=cobranca`);
      await expect(
        page.getByRole("heading", { name: "Confirme a entrega do projeto" }),
      ).toBeVisible();
      await page.getByLabel("Seu nome").fill("Cliente QA");
      await page.getByRole("button", { name: "Confirmar entrega" }).click();

      await expect(page.getByText("Aceite final registrado")).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const admin = adminClient();
      const [acceptanceResult, chargeResult, reviewsResult] = await Promise.all([
        admin
          .from("project_delivery_acceptances")
          .select("signer_name")
          .eq("project_id", fixture.projectId)
          .single(),
        admin
          .from("billing_charges")
          .select("status, pix_qr_code, released_at")
          .eq("project_id", fixture.projectId)
          .eq("kind", "saldo")
          .single(),
        admin
          .from("project_deliverable_reviews")
          .select("action")
          .eq("project_id", fixture.projectId)
          .order("created_at"),
      ]);

      expect(acceptanceResult.error).toBeNull();
      expect(acceptanceResult.data?.signer_name).toBe("Cliente QA");
      expect(chargeResult.error).toBeNull();
      expect(chargeResult.data?.status).toBe("pending");
      expect(chargeResult.data?.pix_qr_code).toBeTruthy();
      expect(chargeResult.data?.released_at).toBeTruthy();
      expect(reviewsResult.error).toBeNull();
      expect(reviewsResult.data?.map((review) => review.action)).toEqual([
        "changes_requested",
        "approved",
      ]);
    });

    await test.step("the completed flow remains compact on desktop", async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/q/${fixture.shareToken}?tab=entregas`);
      await expect(page.getByText("Aprovada por Cliente QA")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await testInfo.attach("deliverables-public-desktop-approved", {
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
  await page.getByLabel("Seu nome").fill("Responsavel Entregas");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await completeCompanyOnboarding(page, "Prumo QA Entregas", {
    profile: "Arquitetura",
  });
}

async function seedProject(email: string, suffix: string) {
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

  const { error: companyError } = await admin
    .from("companies")
    .update({
      plan: "ultimate",
      payment_provider: "manual_pix",
      pix_key_type: "random",
      pix_key: crypto.randomUUID(),
      pix_receiver_name: "Prumo QA",
      pix_receiver_city: "Sao Paulo",
    })
    .eq("id", membership!.company_id);
  expect(companyError).toBeNull();

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      company_id: membership!.company_id,
      name: "Cliente QA Entregas",
      email,
      created_by: user!.id,
    })
    .select("id")
    .single();
  expect(customerError).toBeNull();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      company_id: membership!.company_id,
      customer_id: customer!.id,
      name: "Residencia QA Entregas",
      status: "in_progress",
      budget_cents: 850_000,
      created_by: user!.id,
    })
    .select("id")
    .single();
  expect(projectError).toBeNull();

  const { error: stageError } = await admin.from("project_stages").insert({
    company_id: membership!.company_id,
    project_id: project!.id,
    position: 0,
    name: "Anteprojeto",
    status: "in_progress",
  });
  expect(stageError).toBeNull();

  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .insert({
      company_id: membership!.company_id,
      customer_id: customer!.id,
      project_id: project!.id,
      number: `PROP-ENT-${suffix.slice(0, 8)}`,
      title: "Projeto residencial completo",
      status: "approved",
      subtotal_cents: 850_000,
      total_cents: 850_000,
      approved_at: new Date().toISOString(),
      created_by: user!.id,
    })
    .select("share_token")
    .single();
  expect(quoteError).toBeNull();
  expect(quote?.share_token).toBeTruthy();

  const { error: chargeError } = await admin.from("billing_charges").insert({
    company_id: membership!.company_id,
    customer_id: customer!.id,
    project_id: project!.id,
    kind: "saldo",
    status: "draft",
    amount_cents: 850_000,
    payment_provider: "manual_pix",
  });
  expect(chargeError).toBeNull();

  return {
    projectId: project!.id,
    shareToken: quote!.share_token!,
  };
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
