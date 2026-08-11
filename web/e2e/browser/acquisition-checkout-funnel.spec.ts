import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

test("public demo profile survives pricing, signup, onboarding and checkout", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-chromium",
    "Full acquisition checkout runs once; mobile routes are covered by public smoke.",
  );
  test.setTimeout(600_000);

  const suffix = crypto.randomUUID();
  const email = `acquisition-${testInfo.project.name}-${suffix}@prumo.test`;
  const password = "Prumo-E2E-Acquisition-2026!";
  const companyName = `Estudio Funil QA ${suffix.slice(0, 8)}`;
  const browserErrors: string[] = [];

  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  try {
    await page.goto("/demo");
    await expect(
      page.getByRole("heading", { name: /Veja o fluxo do Prumo por dentro/ }),
    ).toBeVisible();

    const interiorsProfile = page.getByRole("button", { name: "Interiores" });
    await interiorsProfile.click();
    await expect(interiorsProfile).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("link", { name: "Ver planos" }).click();
    await expectUrlParam(page, "/precos", "perfil", "interiors");

    await page.getByRole("link", { name: /Assinar Ultimate/ }).click();
    await expectUrlParam(page, "/signup", "perfil", "interiors");
    await expectUrlParam(page, "/signup", "plan", "ultimate");
    await expect(page.getByText("Design de interiores")).toBeVisible();

    await page.getByLabel("Seu nome").fill("Designer Funil QA");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar minha conta" }).click();

    await expectUrlParam(page, "/onboarding", "perfil", "interiors");
    await expectUrlParam(page, "/onboarding", "plan", "ultimate");
    await expect(
      page.getByRole("radio", { name: /Interiores/i }),
    ).toBeChecked();

    await page.getByLabel(/Nome profissional ou da empresa/).fill(companyName);
    await page.getByLabel("WhatsApp comercial").fill("11999990000");
    await page.getByLabel("Cidade").fill("Sao Paulo");
    await page.getByLabel("UF").fill("SP");
    await page.getByRole("button", { name: "Continuar" }).click();

    const sellGoal = page.locator(
      'input[name="activation_goal"][value="sell"]',
    );
    await expect(sellGoal).toBeVisible();
    await sellGoal.check({ force: true });
    await page.getByRole("button", { name: /Come.ar agora/ }).click();

    await expectUrlParam(
      page,
      "/app/configuracoes/plano/checkout",
      "plan",
      "ultimate",
    );
    await expect(
      page.getByRole("heading", { name: "Assinar Plano Ultimate" }),
    ).toBeVisible();
    await expect(page.getByText("Modo simulado local ativo")).toBeVisible();

    await page
      .getByRole("button", { name: "Ir para pagamento seguro" })
      .click();
    await expect(page).toHaveURL(/\/app\/configuracoes\/plano$/, {
      timeout: 120_000,
    });
    await expect(page.getByText(/Plano atual: Plano Ultimate/)).toBeVisible();

    expect(browserErrors).toEqual([]);
  } finally {
    await cleanupAccount(email);
  }
});

async function expectUrlParam(
  page: Page,
  pathname: string,
  param: string,
  value: string,
) {
  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: `expected pathname to be ${pathname}`,
      timeout: 120_000,
    })
    .toBe(pathname);
  await expect
    .poll(() => new URL(page.url()).searchParams.get(param), {
      message: `expected ${param} to survive in ${pathname}`,
      timeout: 120_000,
    })
    .toBe(value);
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
