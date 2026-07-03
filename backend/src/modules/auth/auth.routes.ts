import { Router } from "express";
import { registerSchema, verifyAccountSchema } from "./auth.schemas";
import { registerUser, verifyAccount } from "./auth.service";
import { requireBasicAuth } from "./auth.middleware";
import { config } from "../../lib/config";

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const user = await registerUser(parsed.username, parsed.password);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/verify", async (req, res, next) => {
  try {
    const parsed = verifyAccountSchema.parse(req.body);
    const user = await verifyAccount(parsed.token);
    res.json({ message: "Account verified", user });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/verify", async (req, res) => {
  const token = String(req.query.token || "").trim();

  if (!token) {
    return res.redirect(`${config.appBaseUrl}/?verified=error`);
  }

  try {
    await verifyAccount(token);
    return res.redirect(`${config.appBaseUrl}/?verified=success`);
  } catch {
    return res.redirect(`${config.appBaseUrl}/?verified=error`);
  }
});

authRouter.get("/me", requireBasicAuth, (req, res) => {
  res.json({ user: req.user });
});
