const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { basicAuth, primaryUser, testData } = require("./fixtures/test-data");
const { apiBase } = require("./fixtures/environment");

function applicationDirectory() {
  if (process.env.APP_DIR) return path.resolve(process.env.APP_DIR);
  const parent = path.resolve(__dirname, "../..");
  return fs.existsSync(path.join(parent, "backend"))
    ? parent
    : path.join(parent, "sap-interview-task");
}

test("BUG-004: a rejected upload does not leave a temporary file", async ({ request }) => {
  test.fail(true, "Known High defect: failed uploads remain in backend/uploads");
  const uploadsDirectory = path.join(applicationDirectory(), "backend", "uploads");
  const uniqueName = `${testData.names.unsupportedUpload}-${Date.now()}.bin`;

  const response = await request.post(`${apiBase}/evidence/upload`, {
    headers: { Authorization: basicAuth(primaryUser) },
    multipart: {
      file: {
        name: uniqueName,
        mimeType: testData.evidence.binaryMimeType,
        buffer: Buffer.from(testData.evidence.unsupportedContent)
      }
    }
  });
  expect(response.status()).toBe(400);

  const remainingFiles = fs.readdirSync(uploadsDirectory);
  const leakedFile = remainingFiles.find(file => file.endsWith(uniqueName));
  try {
    expect(leakedFile).toBeUndefined();
  } finally {
    if (leakedFile) fs.unlinkSync(path.join(uploadsDirectory, leakedFile));
  }
});
