import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../lib/errors";
import { validateBasicCredentials } from "./auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
    }
  }
}

export async function requireBasicAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Basic ")) {
      throw new HttpError(401, "Missing basic auth credentials");
    }

    const encoded = header.slice("Basic ".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");

    if (separator === -1) {
      throw new HttpError(401, "Invalid authorization header");
    }

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    const user = await validateBasicCredentials(username, password);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
