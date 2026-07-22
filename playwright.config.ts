import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: externalBaseUrl ?? "http://localhost:3000",
    trace: "on-first-retry"
  },
  webServer: externalBaseUrl ? undefined : [
    {
      command: "npm run dev:backend",
      url: "http://localhost:4000/health",
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: "npm run dev:frontend",
      url: "http://localhost:3000/login",
      reuseExistingServer: true,
      timeout: 60_000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
