import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    video: isCI ? { mode: "off" } : { mode: "on", size: { width: 2560, height: 1440 } },
    viewport: { width: 2560, height: 1440 },
    deviceScaleFactor: isCI ? 1 : 2,
    launchOptions: isCI ? {} : { slowMo: 800 },
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],

  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
