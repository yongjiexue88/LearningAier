import type { Express } from "express";
import { createFunctionsRouter } from "./functions";

export function registerRoutes(app: Express): void {
  app.use("/functions/v1", createFunctionsRouter());
}
