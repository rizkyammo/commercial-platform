import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,  // ← tambah retry 1x untuk local
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  // Tambah timeout global
  timeout: 60 * 1000,          // 60s per test
  expect: {
    timeout: 15 * 1000,        // 15s per assertion
  },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15 * 1000,  // 15s per action (click, fill, dll)
    navigationTimeout: 30 * 1000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,  // 2 menit untuk startup
  },
});