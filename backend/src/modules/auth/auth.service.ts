import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { pool } from "../../lib/db";
import { HttpError } from "../../lib/errors";
import { sendVerificationEmail } from "./mock-email.service";

export type AuthUser = {
  id: string;
  username: string;
};

export async function registerUser(username: string, password: string) {
  const existing = await pool.query("SELECT id FROM users WHERE username = $1", [
    username
  ]);

  if (existing.rowCount) {
    throw new HttpError(409, "Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = randomBytes(32).toString("hex");

  const result = await pool.query(
    `INSERT INTO users (username, password_hash, is_verified, verification_token, verification_sent_at)
     VALUES ($1, $2, FALSE, $3, NOW())
     RETURNING id, username, is_verified`,
    [username, passwordHash, verificationToken]
  );

  await sendVerificationEmail(username, verificationToken);

  return result.rows[0];
}

export async function verifyAccount(token: string) {
  const result = await pool.query(
    `UPDATE users
     SET is_verified = TRUE,
         verification_token = NULL,
         verification_sent_at = NULL
     WHERE verification_token = $1
     RETURNING id, username, is_verified`,
    [token]
  );

  if (!result.rowCount) {
    throw new HttpError(400, "Invalid or expired verification token");
  }

  return result.rows[0];
}

export async function validateBasicCredentials(
  username: string,
  password: string
): Promise<AuthUser> {
  const result = await pool.query(
    "SELECT id, username, password_hash, is_verified FROM users WHERE username = $1",
    [username]
  );

  const user = result.rows[0];
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new HttpError(401, "Invalid credentials");
  }

  if (!user.is_verified) {
    throw new HttpError(403, "Account is not verified. Check verification email logs.");
  }

  return {
    id: user.id,
    username: user.username
  };
}
