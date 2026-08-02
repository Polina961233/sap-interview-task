const { test, expect } = require("@playwright/test");
const { Client } = require("pg");
const { basicAuth, primaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase, databaseUrl } = require("./fixtures/environment");

test("BUG-002: editing a questionnaire preserves submitted answers", async ({ request }) => {
  test.fail(true, "Known High defect: editing deletes question rows and historical answers");

  const created = await request.post(`${apiBase}/questionnaires`, {
    headers: { Authorization: basicAuth(primaryUser) },
    data: {
      title: uniqueTitle(testData.names.responseHistory),
      questions: [{ prompt: testData.questionnaire.passwordOriginalPrompt, answerType: testData.questionnaire.numberType }]
    }
  });
  expect(created.status()).toBe(201);
  const questionnaire = await created.json();

  const loaded = await request.get(`${apiBase}/questionnaires/${questionnaire.id}`, {
    headers: { Authorization: basicAuth(primaryUser) }
  });
  const originalQuestion = (await loaded.json()).questions[0];

  const submitted = await request.post(`${apiBase}/questionnaires/${questionnaire.id}/responses`, {
    headers: { Authorization: basicAuth(primaryUser) },
    data: { answers: [{ questionId: originalQuestion.id, value: testData.questionnaire.validNumber }] }
  });
  expect(submitted.status()).toBe(201);
  const response = await submitted.json();

  const updated = await request.put(`${apiBase}/questionnaires/${questionnaire.id}`, {
    headers: { Authorization: basicAuth(primaryUser) },
    data: {
      title: questionnaire.title,
      questions: [{ prompt: testData.questionnaire.passwordPrompt, answerType: testData.questionnaire.numberType }]
    }
  });
  expect(updated.status()).toBe(200);

  const database = new Client({
    connectionString: databaseUrl
  });
  await database.connect();
  try {
    const storedAnswers = await database.query(
      "SELECT question_id, value FROM response_answers WHERE response_id = $1",
      [response.id]
    );
    expect(storedAnswers.rows).toEqual([
      { question_id: originalQuestion.id, value: testData.questionnaire.validNumber }
    ]);
  } finally {
    await database.end();
  }
});
