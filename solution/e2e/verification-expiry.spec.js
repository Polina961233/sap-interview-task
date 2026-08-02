const { test, expect } = require("@playwright/test");
const { Client } = require("pg");
const { testData } = require("./fixtures/test-data");
const { apiBase, databaseUrl } = require("./fixtures/environment");

test("BUG-005: an old verification token is rejected", async ({ request }) => {
  test.fail(true, "Known Medium defect: verification_sent_at is not used to expire tokens");
  const username = `${testData.names.expiredUser}_${Date.now()}`;
  const registration = await request.post(`${apiBase}/auth/register`, {
    data: { username, password: testData.strongPassword }
  });
  expect(registration.status()).toBe(201);

  const database = new Client({
    connectionString: databaseUrl
  });
  await database.connect();
  let token;
  try {
    const result = await database.query(
      `UPDATE users
       SET verification_sent_at = NOW() - $2::interval
       WHERE username = $1
       RETURNING verification_token`,
      [username, testData.verificationAge]
    );
    token = result.rows[0].verification_token;
  } finally {
    await database.end();
  }

  const verification = await request.post(`${apiBase}/auth/verify`, {
    data: { token }
  });
  expect(verification.status()).toBe(400);
});
