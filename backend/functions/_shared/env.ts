export function getEnv(key: string, fallback?: string): string | undefined {
  const value = Deno.env.get(key);
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
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

export function getRuntimeConfig(): RuntimeConfig {
  const defaultLLMProvider = getEnv("DEFAULT_LLM_PROVIDER", "gemini")!;
  const embeddingsDimensionsRaw = Number(
    getEnv("EMBEDDINGS_DIMENSIONS", "1536")
  );
  const embeddingsDimensions = Number.isFinite(embeddingsDimensionsRaw)
    ? embeddingsDimensionsRaw
    : 1536;
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    defaultLLMProvider,
    defaultLLMModel: getEnv("DEFAULT_LLM_MODEL", "gemini-2.5-flash")!,
    llmApiKey: requireEnv("LLM_API_KEY"),
    llmBaseUrl: getEnv("LLM_BASE_URL"),
    embeddingsProvider: getEnv("EMBEDDINGS_PROVIDER") ?? defaultLLMProvider,
    embeddingsModel: getEnv("EMBEDDINGS_MODEL", "text-embedding-004")!,
    embeddingsApiKey: getEnv("EMBEDDINGS_API_KEY"),
    embeddingsBaseUrl: getEnv("EMBEDDINGS_BASE_URL"),
    embeddingsDimensions,
  };
}
