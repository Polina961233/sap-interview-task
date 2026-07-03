import { pool } from "./lib/db";

async function migrate() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verification_token TEXT NULL,
      verification_sent_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS users_verification_token_unique_idx
      ON users (verification_token)
      WHERE verification_token IS NOT NULL;

    CREATE TABLE IF NOT EXISTS questionnaires (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    DROP INDEX IF EXISTS questionnaires_title_unique_idx;
    CREATE UNIQUE INDEX IF NOT EXISTS questionnaires_user_title_unique_idx
      ON questionnaires (created_by, lower(title));

    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      answer_type TEXT NOT NULL CHECK (answer_type IN ('text', 'number')),
      regex TEXT NULL,
      position INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS evidence_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS response_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
      question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Migrations complete");
  await pool.end();
}

migrate().catch(async (error) => {
  console.error("Migration failed", error);
  await pool.end();
  process.exit(1);
});
