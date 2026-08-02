const { test, expect } = require("@playwright/test");
const { primaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

test("user creates, completes, and submits a questionnaire", async ({ page }) => {
  const title = uniqueTitle(testData.names.uiQuestionnaire);
  await page.goto("/");
  await page.getByPlaceholder("Username").fill(primaryUser.username);
  await page.getByPlaceholder("Password").fill(primaryUser.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(testData.expectedMessages.loginSuccess)).toBeVisible();

  await page.getByPlaceholder("Questionnaire title").fill(title);
  await page.getByPlaceholder("Question prompt").fill(testData.questionnaire.passwordPrompt);
  await page.getByRole("button", { name: "Save Questionnaire" }).click();
  await expect(page.getByText(testData.expectedMessages.questionnaireCreated)).toBeVisible();

  const fillSection = page.getByRole("heading", { name: "4. Fill Questionnaire" }).locator("..");
  await fillSection.locator("select").selectOption({ label: title });
  await expect(fillSection.getByText(testData.questionnaire.passwordPrompt)).toBeVisible();

  const submit = fillSection.getByRole("button", { name: "Submit Responses" });
  await expect(submit).toBeDisabled();
  await fillSection.getByPlaceholder("Your answer").fill(testData.questionnaire.validNumber);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(testData.expectedMessages.responsesSubmitted)).toBeVisible();
});

test("BUG-007: returning to Select questionnaire does not crash the UI", async ({ page }) => {
  test.fail(true, "BUG-007: selecting the empty questionnaire option crashes the React UI");
  const title = uniqueTitle(testData.names.reselectQuestionnaire);
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await page.getByPlaceholder("Username").fill(primaryUser.username);
  await page.getByPlaceholder("Password").fill(primaryUser.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(testData.expectedMessages.loginSuccess)).toBeVisible();

  await page.getByPlaceholder("Questionnaire title").fill(title);
  await page.getByPlaceholder("Question prompt").fill(testData.questionnaire.passwordPrompt);
  await page.getByRole("button", { name: "Save Questionnaire" }).click();
  await expect(page.getByText(testData.expectedMessages.questionnaireCreated)).toBeVisible();

  const fillSection = page.getByRole("heading", { name: "4. Fill Questionnaire" }).locator("..");
  const selector = fillSection.locator("select");
  await selector.selectOption({ label: title });
  await expect(fillSection.getByText(testData.questionnaire.passwordPrompt)).toBeVisible();

  await Promise.all([
    page.waitForResponse(response =>
      response.url() === `${apiBase}/questionnaires/` && response.request().method() === "GET"
    ),
    selector.selectOption("")
  ]);

  expect(pageErrors).toEqual([]);
  await expect(page.getByRole("heading", { name: "4. Fill Questionnaire" })).toBeVisible();
});
