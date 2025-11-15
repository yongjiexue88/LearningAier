import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

let loaded = false;

export function loadEnvironment(): void {
  if (loaded) return;

  // Load default .env if present.
  const root = process.cwd();
  const defaultEnvPath = path.join(root, ".env");
  if (fs.existsSync(defaultEnvPath)) {
    loadEnv({ path: defaultEnvPath });
  }

  const target =
    process.env.APP_ENV ??
    process.env.RUNTIME_ENV ??
    process.env.NODE_ENV ??
    "local";
  const targetPath = path.join(root, `.env.${target}`);
  if (fs.existsSync(targetPath)) {
    loadEnv({ path: targetPath, override: true });
  }

  loaded = true;
}
