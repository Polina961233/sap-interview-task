const { test, expect } = require("@playwright/test");
const { primaryUser, testData } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

test.describe("authentication", () => {
  test("protected API rejects anonymous requests", async ({ request }) => {
    const response = await request.get(`${apiBase}/questionnaires`);
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      message: testData.expectedMessages.missingAuth
    });
  });

  test("verified user can sign in through the UI", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Username").fill(primaryUser.username);
    await page.getByPlaceholder("Password").fill(primaryUser.password);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText(testData.expectedMessages.loginSuccess)).toBeVisible();
    await expect(page.getByText(testData.expectedMessages.signInRequired)).toHaveCount(0);
  });

  for (const weakPassword of testData.weakPasswords) {
    test(`BUG-011: registration rejects weak password: ${weakPassword}`, async ({ request }) => {
      test.fail(true, "BUG-011: registration accepts passwords with no meaningful strength requirement");
      const response = await request.post(`${apiBase}/auth/register`, {
        data: {
          username: `weak_password_${Date.now()}_${weakPassword}`,
          password: weakPassword
        }
      });

      expect(response.status()).toBe(400);
    });
  }
});
