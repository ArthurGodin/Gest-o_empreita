import { expect, type Page } from "@playwright/test";

export async function completeCompanyOnboarding(
  page: Page,
  companyName: string,
) {
  const companyNameInput = page.getByLabel(/Nome da empresa/);
  const phoneInput = page.getByLabel("WhatsApp comercial");
  const cityInput = page.getByLabel("Cidade");
  const stateInput = page.getByLabel("UF");

  await expect(companyNameInput).toBeVisible({ timeout: 10_000 });
  await expect(phoneInput).toBeVisible({ timeout: 10_000 });
  await expect(cityInput).toBeVisible({ timeout: 10_000 });
  await expect(stateInput).toBeVisible({ timeout: 10_000 });

  await companyNameInput.fill(companyName);
  await phoneInput.fill("11999990000");
  await cityInput.fill("Sao Paulo");
  await stateInput.fill("SP");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page).toHaveURL(/\/app(?:\?|$)/);
}
