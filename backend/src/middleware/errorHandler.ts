import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const safeMessage = err instanceof Error ? err.message : String(err);

  if (err instanceof AppError) {
    console.error("[API] AppError", {
      status: err.status,
      message: err.message,
      details: err.details ?? null,
    });
    res.status(err.status).json({
      error: err.message,
      details: err.details ?? null,
    });
    return;
  }

  if (err instanceof SyntaxError) {
    console.error("[API] SyntaxError", safeMessage);
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  console.error("[API] Unhandled error", err);
  res.status(500).json({ error: "Internal Server Error" });
}
