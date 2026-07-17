import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PRUMO_E2E_BASE_URL ?? "http://127.0.0.1:3100";
const localBrowser = process.env.CI ? {} : { channel: "chrome" as const };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "database",
      testMatch: /database\/.*\.spec\.ts/,
    },
    {
      name: "desktop-chromium",
      testMatch: /browser\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], ...localBrowser },
    },
    {
      name: "mobile-chromium",
      testMatch: /browser\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"], ...localBrowser },
    },
  ],
});
