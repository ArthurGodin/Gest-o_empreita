import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/precos",
  "/login",
  "/signup",
  "/termos",
  "/privacidade",
];

test("public pages load without horizontal overflow or browser errors", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  for (const route of publicRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${route} should respond successfully`).toBeLessThan(
      400,
    );
    await expect(page.locator("body")).toBeVisible();

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      overflow.scrollWidth,
      `${route} should not overflow horizontally`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }

  expect(browserErrors).toEqual([]);
});
