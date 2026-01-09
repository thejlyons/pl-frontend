import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  globalSetup: "./tests/global.setup.ts",
  // Shared test database; run serially to avoid cross-test contamination.
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4173",
    trace: "on-first-retry",
    video: process.env.SHOWCASE_VIDEO ? "on" : "retain-on-failure",
    launchOptions: {
      // Slow down actions for showcase recordings when requested.
      slowMo: (() => {
        if (process.env.SHOWCASE_SLOWMO) return Number(process.env.SHOWCASE_SLOWMO) || 250;
        if (process.env.SHOWCASE_VIDEO) return 400; // default slow-down when showcasing
        return 0;
      })(),
    },
  },
  webServer: [
    {
      command: "go run .",
      cwd: "../pl-backend",
      env: {
        DATABASE_URL: "sqlite://file:perennial_e2e.db?cache=shared&_fk=1",
        AUTO_MIGRATE: "1",
        APP_ENV: "test",
        PORT: "18080",
      },
      url: "http://localhost:18080/health",
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host --port 4173",
      cwd: "./",
      env: {
        API_BASE_URL: "http://localhost:18080",
        VITE_API_BASE_URL: "http://localhost:18080",
      },
      url: "http://localhost:4173",
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
});
