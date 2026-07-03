import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(1)
});

export const verifyAccountSchema = z.object({
  token: z.string().min(1)
});
