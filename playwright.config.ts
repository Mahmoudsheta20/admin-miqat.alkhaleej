import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "**/*.spec.ts", timeout: 45_000,
  expect: { timeout: 10_000 }, fullyParallel: false, workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3419", locale: "en-GB", trace: "retain-on-failure", screenshot: "only-on-failure", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" } },
  webServer: [
    { command: "node tests/e2e/fixture-server.mjs", url: "http://127.0.0.1:5109/api/health", reuseExistingServer: !process.env.CI },
    { command: "npm run dev -- --hostname 127.0.0.1 --port 3419", url: "http://127.0.0.1:3419/login", reuseExistingServer: !process.env.CI, timeout: 120_000, env: { BACKEND_URL: "http://127.0.0.1:5109", NEXT_PUBLIC_BACKEND_URL: "http://127.0.0.1:5109", MIQAT_E2E: "1" } },
  ],
});
