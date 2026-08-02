const { test, expect } = require("@playwright/test");
const { basicAuth, primaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

for (const prompt of testData.questionnaire.invalidPrompts) {
  test(`BUG-003: invalid prompt ${JSON.stringify(prompt)} returns a client error`, async ({ request }) => {
    test.fail(true, "Known Medium defect: Zod errors are returned as HTTP 500");
    const response = await request.post(`${apiBase}/questionnaires`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: {
        title: uniqueTitle(testData.names.invalidPrompt),
        questions: [{ prompt, answerType: testData.questionnaire.textType }]
      }
    });

    expect([400, 422]).toContain(response.status());
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ message: expect.any(String) })
    );
  });
}
