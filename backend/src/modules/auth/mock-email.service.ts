import { config } from "../../lib/config";

export async function sendVerificationEmail(username: string, token: string) {
  const link = `${config.apiBaseUrl}/auth/verify?token=${encodeURIComponent(token)}`;

  console.log("[mock-email] verification email queued");
  console.log(`[mock-email] to: ${username}`);
  console.log(`[mock-email] verify-link: ${link}`);
}
