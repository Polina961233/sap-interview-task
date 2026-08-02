const { test, expect } = require("@playwright/test");
const { primaryUser } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

test("frontend sends API requests to the configured deployment API address", async ({ page }) => {
  const expectedApiBase = process.env.API_BASE_URL;
  test.skip(
    !expectedApiBase,
    "Requires a deployed environment and an explicit API_BASE_URL; localhost-only execution cannot confirm this risk"
  );

  await page.goto("/");
  await page.getByPlaceholder("Username").fill(primaryUser.username);
  await page.getByPlaceholder("Password").fill(primaryUser.password);

  const apiRequest = page.waitForRequest(request => request.url().endsWith("/auth/me"));
  await page.getByRole("button", { name: "Login" }).click();
  const request = await apiRequest;

  expect(request.url().startsWith(apiBase)).toBe(true);
});
