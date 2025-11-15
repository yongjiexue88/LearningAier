import { loadEnvironment } from "./loadEnv";

loadEnvironment();

function getEnv(key: string, fallback?: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export interface RuntimeConfig {
  port: number;
  firebaseProjectId: string;
  firebaseClientEmail?: string;
  firebasePrivateKey?: string;
  firebaseCredentialJson?: string;
  firebaseStorageBucket?: string;
  defaultLLMProvider: string;
  defaultLLMModel: string;
  llmApiKey: string;
  llmBaseUrl?: string;
  embeddingsProvider?: string;
  embeddingsModel: string;
  embeddingsApiKey?: string;
  embeddingsBaseUrl?: string;
  embeddingsDimensions: number;
}

const embeddingsDimensionsRaw = Number(
  getEnv("EMBEDDINGS_DIMENSIONS", "1536")
);
const embeddingsDimensions = Number.isFinite(embeddingsDimensionsRaw)
  ? embeddingsDimensionsRaw
  : 1536;

export const runtimeConfig: RuntimeConfig = {
  port: Number(getEnv("PORT", "8787")),
  firebaseProjectId: getEnv("FIREBASE_PROJECT_ID") ?? "",
  firebaseClientEmail: getEnv("FIREBASE_CLIENT_EMAIL"),
  firebasePrivateKey: getEnv("FIREBASE_PRIVATE_KEY"),
  firebaseCredentialJson: getEnv("FIREBASE_CREDENTIAL_JSON"),
  firebaseStorageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  defaultLLMProvider: getEnv("DEFAULT_LLM_PROVIDER", "gemini")!,
  defaultLLMModel: getEnv("DEFAULT_LLM_MODEL", "gemini-2.5-flash")!,
  llmApiKey: requireEnv("LLM_API_KEY"),
  llmBaseUrl: getEnv("LLM_BASE_URL"),
  embeddingsProvider: getEnv("EMBEDDINGS_PROVIDER"),
  embeddingsModel: getEnv("EMBEDDINGS_MODEL", "text-embedding-004")!,
  embeddingsApiKey: getEnv("EMBEDDINGS_API_KEY"),
  embeddingsBaseUrl: getEnv("EMBEDDINGS_BASE_URL"),
  embeddingsDimensions,
};

export { getEnv, requireEnv };
