const { defineConfig, devices } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs");
const { apiBase, frontendBase } = require("./e2e/fixtures/environment");

const parent = path.resolve(__dirname, "..");
const appDir = process.env.APP_DIR
  ? path.resolve(process.env.APP_DIR)
  : fs.existsSync(path.join(parent, "backend"))
    ? parent
    : path.join(parent, "sap-interview-task");

module.exports = defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.js",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendBase,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "bun run start",
          cwd: path.join(appDir, "backend"),
          url: `${apiBase}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          stdout: "pipe",
          stderr: "pipe"
        },
        {
          command: "npm run dev -- --host 127.0.0.1",
          cwd: path.join(appDir, "frontend"),
          url: frontendBase,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe"
        }
      ]
});
