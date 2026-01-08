import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  globalSetup: "./tests/global.setup.ts",
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4173",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "cd ../pl-backend && APP_ENV=test PORT=18080 go run ./...",
      url: "http://localhost:18080/health",
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      command:
        "cd ../pl-frontend && API_BASE_URL=http://localhost:18080 npm run dev -- --host --port 4173",
      url: "http://localhost:4173",
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
