const { test, expect } = require("@playwright/test");
const { basicAuth, primaryUser, secondaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

test("BUG-001: evidence retrieval must be scoped to uploader", async ({ request }) => {
  test.fail(true, "Known Critical defect: evidence search is not filtered by uploader");
  const privateText = `${testData.names.privateMarker}-${Date.now()} ${testData.evidence.privateTextSuffix}`;
  const privateFileName = `${testData.names.privateEvidence}-${Date.now()}.txt`;
  const upload = await request.post(`${apiBase}/evidence/upload`, {
    headers: { Authorization: basicAuth(primaryUser) },
    multipart: {
      file: {
        name: privateFileName,
        mimeType: "text/plain",
        buffer: Buffer.from(privateText)
      }
    }
  });
  expect(upload.status()).toBe(201);

  const created = await request.post(`${apiBase}/questionnaires`, {
    headers: { Authorization: basicAuth(secondaryUser) },
    data: {
      title: uniqueTitle(testData.names.isolation),
      questions: [{ prompt: privateText, answerType: testData.questionnaire.textType }]
    }
  });
  const summary = await created.json();
  const loaded = await request.get(`${apiBase}/questionnaires/${summary.id}`, {
    headers: { Authorization: basicAuth(secondaryUser) }
  });
  const details = await loaded.json();

  const leakedEvidence = details.questions[0].evidence.filter(
    item => item.fileName === privateFileName
  );
  expect(leakedEvidence).toHaveLength(0);
});
