import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: process.env.KANA_TEST_EXTERNAL_SERVER
    ? undefined
    : {
        command:
          "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
      },
});
