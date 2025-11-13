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
  embeddingsModel: string;
  embeddingsApiKey?: string;
  embeddingsBaseUrl?: string;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    defaultLLMProvider: getEnv("DEFAULT_LLM_PROVIDER", "openai")!,
    defaultLLMModel: getEnv("DEFAULT_LLM_MODEL", "gpt-4.1-mini")!,
    llmApiKey: requireEnv("LLM_API_KEY"),
    llmBaseUrl: getEnv("LLM_BASE_URL"),
    embeddingsModel: getEnv("EMBEDDINGS_MODEL", "text-embedding-3-large")!,
    embeddingsApiKey: getEnv("EMBEDDINGS_API_KEY"),
    embeddingsBaseUrl: getEnv("EMBEDDINGS_BASE_URL"),
  };
}
