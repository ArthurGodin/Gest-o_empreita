import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { completeCompanyOnboarding } from "../helpers/onboarding";
import { prepareDemoWorkspace } from "../helpers/demo-workspace";

test("architecture profile creates a proposal from a professional model", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);

  const suffix = crypto.randomUUID();
  const email = `architecture-${testInfo.project.name}-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Architecture-2026!";
  const customerName = `Cliente Arquitetura ${suffix.slice(0, 8)}`;

  try {
    await page.goto("/signup");
    await page.getByLabel("Seu nome").fill("Arquiteta QA");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    await completeCompanyOnboarding(page, "Estúdio Arquitetura QA", {
      profile: "Arquitetura",
    });

    await expect(
      page.getByRole("link", { name: "Propostas", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Projetos", exact: true }),
    ).toBeVisible();

    await page.goto("/app/clientes/novo");
    await page.locator("#name").fill(customerName);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page).toHaveURL(/\/app\/clientes\/[0-9a-f-]+$/);

    await page.goto("/app/orcamentos/novo");
    await expect(
      page.getByRole("heading", { name: "Nova proposta" }),
    ).toBeVisible();
    await expect(page.getByLabel("Título da proposta")).toBeVisible();
    await page.locator("#customer").selectOption({ label: customerName });
    await page
      .getByRole("radio", { name: /Projeto arquitetônico residencial/ })
      .check({ force: true });
    await page.getByRole("button", { name: "Criar proposta" }).click();

    await expect(page).toHaveURL(/\/app\/orcamentos\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", {
        name: "Projeto arquitetônico residencial",
      }),
    ).toBeVisible();
    const itemDescriptions = page.locator('input[id^="description-"]');
    await expect(itemDescriptions).toHaveCount(5);
    await expect(itemDescriptions.first()).toHaveValue(
      "Briefing e levantamento inicial",
    );

    await page.goto("/app/configuracoes");
    await expect(
      page.getByRole("radio", { name: /Arquitetura/ }),
    ).toBeChecked();
  } finally {
    await cleanupAccount(email);
  }
});

test("architecture profile prepares contextual demo data", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);

  const suffix = crypto.randomUUID();
  const email = `architecture-demo-${testInfo.project.name}-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Architecture-Demo-2026!";

  try {
    await page.goto("/signup");
    await page.getByLabel("Seu nome").fill("Arquiteta Demo QA");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    await completeCompanyOnboarding(page, "Estudio Arquitetura Demo QA", {
      profile: "Arquitetura",
    });

    await prepareDemoWorkspace(page, email);
    await page.getByRole("link", { name: "Abrir proposta" }).click();
    await expect(page).toHaveURL(/\/app\/orcamentos\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", {
        name: "Demo - Projeto arquitetonico residencial",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Cliente Demo - Ana Ribeiro", { exact: true }).first(),
    ).toBeVisible();

    await page.goto("/app/obras");
    await expect(page.getByRole("heading", { name: "Projetos" })).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Abrir projeto Demo - Projeto residencial Ana Ribeiro/,
      }),
    ).toBeVisible();

    await page
      .getByRole("link", {
        name: /Abrir projeto Demo - Projeto residencial Ana Ribeiro/,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Demo - Projeto residencial Ana Ribeiro",
      }),
    ).toBeVisible();
    await page.goto(`${new URL(page.url()).pathname}?view=entregas`);
    await expect(page.getByText("Estudo preliminar v1")).toBeVisible();
  } finally {
    await cleanupAccount(email);
  }
});

async function cleanupAccount(email: string) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  const { data } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const user = data.users.find((candidate) => candidate.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
}
