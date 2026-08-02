const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { basicAuth, primaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");
const pdfPath = process.env.COMPLIANCE_PDF_PATH;

test("BUG-009: uploaded compliance PDF is retrieved for an exact question phrase", async ({ request }) => {
  test.skip(!pdfPath, "Set COMPLIANCE_PDF_PATH to run the supplied-PDF retrieval check");
  test.fail(true, "BUG-009: supplied PDF is indexed but not returned for its exact visitor-control phrase");
  expect(fs.existsSync(pdfPath)).toBeTruthy();

  const upload = await request.post(`${apiBase}/evidence/upload`, {
    headers: { Authorization: basicAuth(primaryUser) },
    multipart: {
      file: {
        name: path.basename(pdfPath),
        mimeType: testData.evidence.pdfMimeType,
        buffer: fs.readFileSync(pdfPath)
      }
    }
  });
  expect(upload.status()).toBe(201);
  const uploadResult = await upload.json();
  expect(uploadResult.chunks).toBeGreaterThan(0);

  const exactPhrase = testData.evidence.compliancePhrase;
  const created = await request.post(`${apiBase}/questionnaires`, {
    headers: { Authorization: basicAuth(primaryUser) },
    data: {
      title: uniqueTitle(testData.names.compliancePdf),
      questions: [{ prompt: exactPhrase, answerType: testData.questionnaire.textType }]
    }
  });
  expect(created.status()).toBe(201);
  const summary = await created.json();

  const loaded = await request.get(`${apiBase}/questionnaires/${summary.id}`, {
    headers: { Authorization: basicAuth(primaryUser) }
  });
  expect(loaded.status()).toBe(200);
  const details = await loaded.json();
  const matchingEvidence = details.questions[0].evidence.filter(item =>
    item.fileName === path.basename(pdfPath)
  );

  expect(matchingEvidence.length).toBeGreaterThan(0);
  expect(matchingEvidence[0].snippet).toContain(testData.evidence.complianceSnippet);
});
