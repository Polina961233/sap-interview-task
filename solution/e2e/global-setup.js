const bcrypt = require("bcryptjs");
const { Client } = require("pg");
const { primaryUser, secondaryUser } = require("./fixtures/test-data");
const { databaseUrl, qdrantUrl, qdrantCollection } = require("./fixtures/environment");

module.exports = async function globalSetup() {
  const client = new Client({
    connectionString: databaseUrl
  });

  await client.connect();
  try {
    const userIds = [];
    for (const user of [primaryUser, secondaryUser]) {
      const passwordHash = await bcrypt.hash(user.password, 4);
      const result = await client.query(
        `INSERT INTO users (username, password_hash, is_verified)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (username) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             is_verified = TRUE,
             verification_token = NULL
         RETURNING id`,
        [user.username, passwordHash]
      );
      userIds.push(result.rows[0].id);
    }

    await client.query("DELETE FROM questionnaires WHERE created_by = ANY($1::uuid[])", [userIds]);
    await client.query("DELETE FROM evidence_files WHERE uploaded_by = ANY($1::uuid[])", [userIds]);
    await client.query(
      "DELETE FROM users WHERE username LIKE 'weak_password_%' OR username LIKE 'expired_token_%'"
    );

    for (const userId of userIds) {
      const response = await fetch(
        `${qdrantUrl}/collections/${qdrantCollection}/points/delete?wait=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filter: { must: [{ key: "uploadedBy", match: { value: userId } }] }
          })
        }
      );
      if (!response.ok) {
        throw new Error(`Could not clean Qdrant test data: HTTP ${response.status}`);
      }
    }
  } finally {
    await client.end();
  }
};
