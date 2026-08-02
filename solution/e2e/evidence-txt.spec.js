const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { basicAuth, primaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

function applicationDirectory() {
  if (process.env.APP_DIR) return path.resolve(process.env.APP_DIR);
  const parent = path.resolve(__dirname, "../..");
  if (fs.existsSync(path.join(parent, "backend"))) return parent;
  return path.join(parent, "sap-interview-task");
}

function firstApplicationChunk(text, maxChars = 600) {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  let chunk = "";
  for (const sentence of sentences) {
    const candidate = `${chunk} ${sentence}`.trim();
    if (candidate.length > maxChars) break;
    chunk = candidate;
  }
  return chunk;
}

for (const fixture of testData.evidence.textFixtures) {
  test(`${fixture.fileName} is uploaded, indexed, and retrieved for matching text`, async ({ request }) => {
    const filePath = path.join(
      applicationDirectory(),
      "sample-evidence",
      fixture.fileName
    );
    const fileName = `${fixture.uploadPrefix}-${Date.now()}.txt`;
    const contents = fs.readFileSync(filePath, "utf8");
    const matchingQuestion = firstApplicationChunk(contents, testData.evidence.maximumQueryChars);

    const upload = await request.post(`${apiBase}/evidence/upload`, {
      headers: { Authorization: basicAuth(primaryUser) },
      multipart: {
        file: { name: fileName, mimeType: testData.evidence.textMimeType, buffer: Buffer.from(contents) }
      }
    });
    expect(upload.status()).toBe(201);
    await expect(upload.json()).resolves.toEqual(
      expect.objectContaining({ evidenceFileId: expect.any(String), chunks: expect.any(Number) })
    );

    const created = await request.post(`${apiBase}/questionnaires`, {
      headers: { Authorization: basicAuth(primaryUser) },
      data: {
        title: uniqueTitle(`${testData.names.textEvidence}-${fixture.uploadPrefix}`),
        questions: [{ prompt: matchingQuestion, answerType: testData.questionnaire.textType }]
      }
    });
    const questionnaire = await created.json();

    const loaded = await request.get(`${apiBase}/questionnaires/${questionnaire.id}`, {
      headers: { Authorization: basicAuth(primaryUser) }
    });
    expect(loaded.status()).toBe(200);
    const details = await loaded.json();
    const uploadedFileResults = details.questions[0].evidence.filter(
      item => item.fileName === fileName
    );

    expect(uploadedFileResults.length).toBeGreaterThan(0);
    expect(uploadedFileResults[0].score).toBeGreaterThanOrEqual(testData.evidence.minimumScore);
  });
}
