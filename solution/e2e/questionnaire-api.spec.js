const { test, expect } = require("@playwright/test");
const { basicAuth, primaryUser, secondaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

test.describe("questionnaire API", () => {
  test("enforces ownership between users", async ({ request }) => {
    const created = await request.post(`${apiBase}/questionnaires`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: {
        title: uniqueTitle(testData.names.ownership),
        questions: [{ prompt: testData.questionnaire.ownershipPrompt, answerType: testData.questionnaire.textType }]
      }
    });
    expect(created.status()).toBe(201);
    const questionnaire = await created.json();

    const crossUserRead = await request.get(
      `${apiBase}/questionnaires/${questionnaire.id}`,
      { headers: { Authorization: basicAuth(secondaryUser) } }
    );
    expect(crossUserRead.status()).toBe(404);

    const crossUserUpdate = await request.put(
      `${apiBase}/questionnaires/${questionnaire.id}`,
      {
        headers: { Authorization: basicAuth(secondaryUser) },
        data: {
          title: testData.questionnaire.stolenTitle,
          questions: [{ prompt: testData.questionnaire.changedPrompt, answerType: testData.questionnaire.textType }]
        }
      }
    );
    expect(crossUserUpdate.status()).toBe(404);
  });

  test("rejects duplicate titles for the same owner", async ({ request }) => {
    const title = uniqueTitle(testData.names.duplicate);
    const data = {
      title,
      questions: [{ prompt: testData.questionnaire.passwordShortPrompt, answerType: testData.questionnaire.numberType }]
    };

    const first = await request.post(`${apiBase}/questionnaires`, {
      headers: { Authorization: basicAuth(primaryUser) }, data
    });
    const second = await request.post(`${apiBase}/questionnaires`, {
      headers: { Authorization: basicAuth(primaryUser) }, data
    });

    expect(first.status()).toBe(201);
    expect(second.status()).toBe(409);
  });

  test("requires every answer and validates number and regex rules", async ({ request }) => {
    const created = await request.post(`${apiBase}/questionnaires`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: {
        title: uniqueTitle(testData.names.validation),
        questions: [
          { prompt: testData.questionnaire.minimumLengthPrompt, answerType: testData.questionnaire.numberType },
          { prompt: testData.questionnaire.algorithmPrompt, answerType: testData.questionnaire.textType, regex: testData.questionnaire.algorithmRegex }
        ]
      }
    });
    expect(created.status()).toBe(201);
    const summary = await created.json();

    const detailsResponse = await request.get(`${apiBase}/questionnaires/${summary.id}`, {
      headers: { Authorization: basicAuth(primaryUser) }
    });
    expect(detailsResponse.ok()).toBeTruthy();
    const details = await detailsResponse.json();
    const [numberQuestion, regexQuestion] = details.questions;

    const incomplete = await request.post(`${apiBase}/questionnaires/${summary.id}/responses`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: { answers: [{ questionId: numberQuestion.id, value: testData.questionnaire.validNumber }] }
    });
    expect(incomplete.status()).toBe(400);

    const badNumber = await request.post(`${apiBase}/questionnaires/${summary.id}/responses`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: { answers: [
        { questionId: numberQuestion.id, value: testData.questionnaire.invalidNumberText },
        { questionId: regexQuestion.id, value: testData.questionnaire.validAlgorithm }
      ] }
    });
    expect(badNumber.status()).toBe(400);

    const badRegex = await request.post(`${apiBase}/questionnaires/${summary.id}/responses`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: { answers: [
        { questionId: numberQuestion.id, value: testData.questionnaire.validNumber },
        { questionId: regexQuestion.id, value: testData.questionnaire.invalidAlgorithm }
      ] }
    });
    expect(badRegex.status()).toBe(400);

    const valid = await request.post(`${apiBase}/questionnaires/${summary.id}/responses`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: { answers: [
        { questionId: numberQuestion.id, value: testData.questionnaire.validNumber },
        { questionId: regexQuestion.id, value: testData.questionnaire.validAlgorithm }
      ] }
    });
    expect(valid.status()).toBe(201);
    await expect(valid.json()).resolves.toEqual(expect.objectContaining({ id: expect.any(String) }));
  });

  for (const invalidNumber of testData.questionnaire.invalidNumbers) {
    test(`BUG-008: rejects unsupported numeric value: ${invalidNumber}`, async ({ request }) => {
      test.fail(true, "BUG-008: number questions have no sign, precision, or length constraints");
      const created = await request.post(`${apiBase}/questionnaires`, {
        headers: { Authorization: basicAuth(primaryUser) },
        data: {
          title: uniqueTitle(testData.names.numericBoundaries),
          questions: [{ prompt: testData.questionnaire.minimumLengthPrompt, answerType: testData.questionnaire.numberType }]
        }
      });
      expect(created.status()).toBe(201);
      const summary = await created.json();
      const details = await request.get(`${apiBase}/questionnaires/${summary.id}`, {
        headers: { Authorization: basicAuth(primaryUser) }
      });
      const question = (await details.json()).questions[0];

      const submitted = await request.post(`${apiBase}/questionnaires/${summary.id}/responses`, {
        headers: { Authorization: basicAuth(primaryUser) },
        data: { answers: [{ questionId: question.id, value: invalidNumber }] }
      });

      expect(submitted.status()).toBe(400);
    });
  }

  test("BUG-012: rejects a question prompt containing only whitespace", async ({ request }) => {
    test.fail(true, "BUG-012: question prompt validation counts whitespace as content");
    const response = await request.post(`${apiBase}/questionnaires`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: {
        title: uniqueTitle(testData.names.blankPrompt),
        questions: [{ prompt: testData.questionnaire.whitespacePrompt, answerType: testData.questionnaire.textType }]
      }
    });

    expect(response.status()).toBe(400);
  });
});
