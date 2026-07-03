import type { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "Route not found"));
}

export function errorHandler(
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
}
