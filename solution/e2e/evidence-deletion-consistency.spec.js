const { test, expect } = require("@playwright/test");
const { Client } = require("pg");
const { basicAuth, primaryUser, testData, uniqueTitle } = require("./fixtures/test-data");
const { apiBase, databaseUrl } = require("./fixtures/environment");

test("BUG-010: deleting evidence metadata also removes its searchable Qdrant content", async ({ request }) => {
  test.fail(true, "BUG-010: PostgreSQL evidence deletion leaves searchable vectors in Qdrant");
  const marker = `${testData.names.deletionMarker}-${Date.now()}`;
  const evidenceText = `${marker}. ${testData.evidence.deletionTextSuffix}`;

  const upload = await request.post(`${apiBase}/evidence/upload`, {
    headers: { Authorization: basicAuth(primaryUser) },
    multipart: {
      file: {
        name: `${marker}.txt`,
        mimeType: testData.evidence.textMimeType,
        buffer: Buffer.from(evidenceText)
      }
    }
  });
  expect(upload.status()).toBe(201);
  const { evidenceFileId } = await upload.json();

  const database = new Client({
    connectionString: databaseUrl
  });
  await database.connect();
  try {
    const deleted = await database.query(
      "DELETE FROM evidence_files WHERE id = $1 RETURNING id",
      [evidenceFileId]
    );
    expect(deleted.rowCount).toBe(1);
  } finally {
    await database.end();
  }

  const created = await request.post(`${apiBase}/questionnaires`, {
    headers: { Authorization: basicAuth(primaryUser) },
    data: {
      title: uniqueTitle(testData.names.deletionQuestionnaire),
      questions: [{ prompt: evidenceText, answerType: testData.questionnaire.textType }]
    }
  });
  const summary = await created.json();
  const loaded = await request.get(`${apiBase}/questionnaires/${summary.id}`, {
    headers: { Authorization: basicAuth(primaryUser) }
  });
  const details = await loaded.json();
  const deletedEvidence = details.questions[0].evidence.filter(
    item => item.fileName === `${marker}.txt`
  );

  expect(deletedEvidence).toHaveLength(0);
});
