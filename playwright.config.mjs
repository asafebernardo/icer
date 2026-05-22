import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = process.env.E2E_PORT || "3099";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.mjs",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    storageState: "e2e/.auth/admin.json",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://127.0.0.1:${E2E_PORT}/Home`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { E2E_PORT },
  },
});
