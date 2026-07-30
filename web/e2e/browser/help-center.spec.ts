import { expect, test } from "@playwright/test";

test("help center resolves common questions without leaking search text", async ({
  page,
}) => {
  const outboundRequests: string[] = [];
  page.on("request", (request) => {
    outboundRequests.push(`${request.url()}\n${request.postData() ?? ""}`);
  });

  await page.goto("/ajuda?topico=usar-sinapi");

  await expect(
    page.getByRole("heading", { name: "Central de Ajuda", level: 1 }),
  ).toBeVisible();
  await expect(page.locator("details#usar-sinapi")).toHaveAttribute("open", "");

  const search = page.getByLabel("O que você precisa resolver?");
  const privateSearch = "segredo-do-cliente-123";
  await search.fill(privateSearch);
  await expect(
    page.getByRole("heading", { name: "Nenhuma resposta encontrada" }),
  ).toBeVisible();

  await page.waitForTimeout(800);
  const serializedRequests = JSON.stringify(outboundRequests);
  expect(serializedRequests).not.toContain(privateSearch);
  expect(serializedRequests).not.toContain("/api/product-events");

  const supportHref = await page
    .getByRole("link", { name: "Enviar e-mail" })
    .getAttribute("href");
  expect(supportHref).toMatch(/^mailto:suporte-e2e@prumo\.test\?/);
  expect(decodeURIComponent(supportHref ?? "")).not.toContain(privateSearch);

  await page.getByRole("button", { name: "Limpar busca" }).last().click();
  await page.getByRole("button", { name: "Cobranças" }).click();
  await expect(
    page.getByText("Qual a diferença entre Pix manual e Asaas?"),
  ).toBeVisible();
  await expect(page.getByText("Como cadastro ou edito um cliente?")).toBeHidden();

  await page.getByText("Qual a diferença entre Pix manual e Asaas?").click();
  await expect(page.locator("details#pix-manual-ou-asaas")).toHaveAttribute(
    "open",
    "",
  );

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});
