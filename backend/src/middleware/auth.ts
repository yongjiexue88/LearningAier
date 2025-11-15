import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { UnauthorizedError } from "../errors";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

function extractBearerToken(header?: string | null): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return null;
}

export async function authenticateRequest(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    throw new UnauthorizedError("Missing Authorization header");
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as AuthenticatedRequest).user = {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
    };
    next();
  } catch (error) {
    console.error("[Auth] Failed to verify token", error);
    throw new UnauthorizedError("Invalid or expired auth token");
  }
}
