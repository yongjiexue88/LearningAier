import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getRuntimeConfig } from "./env.ts";
import { LLMClient, type JSONGenerationParams } from "../../src/llm/client.ts";

const runtime = getRuntimeConfig();

export interface UserScopedLLMParams extends Omit<JSONGenerationParams, "metadata"> {
  userId: string;
}

export async function getLLMClient(
  supabase: SupabaseClient,
  userId: string
): Promise<LLMClient> {
  const { data, error } = await supabase
    .from("profiles")
    .select("llm_provider, llm_model")
    .eq("id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  const providerSource = data?.llm_provider ?? runtime.defaultLLMProvider;
  const provider = providerSource.toLowerCase();
  return new LLMClient({
    provider,
    model: data?.llm_model ?? runtime.defaultLLMModel,
    apiKey: runtime.llmApiKey,
    baseUrl: runtime.llmBaseUrl,
  });
}

export async function generateUserJSON<T>(
  supabase: SupabaseClient,
  params: UserScopedLLMParams
): Promise<T> {
  const client = await getLLMClient(supabase, params.userId);
  return await client.generateJSON<T>({
    ...params,
    metadata: {
      ...params.metadata,
      userId: params.userId,
    },
  });
}
