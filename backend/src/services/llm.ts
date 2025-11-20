import { runtimeConfig } from "../config/runtime";
import { getProfileById } from "./firestore";
import { LLMClient, type JSONGenerationParams } from "../llm/client";

const runtime = runtimeConfig;

export interface UserScopedLLMParams extends JSONGenerationParams {
  userId: string;
  model?: string;
  provider?: string;
}

async function getLLMClient(
  userId: string,
  overrides?: { model?: string; provider?: string }
): Promise<LLMClient> {
  const profile = await getProfileById(userId);
  const providerSource =
    overrides?.provider ??
    profile?.llm_provider ??
    runtime.defaultLLMProvider;
  const provider = providerSource.toLowerCase();
  return new LLMClient({
    provider,
    model: overrides?.model ?? profile?.llm_model ?? runtime.defaultLLMModel,
    apiKey: runtime.llmApiKey,
    baseUrl: runtime.llmBaseUrl,
  });
}

export async function generateUserJSON<T>(
  params: UserScopedLLMParams
): Promise<T> {
  const { userId, model, provider, ...rest } = params;
  const client = await getLLMClient(userId, { model, provider });
  const { metadata, ...llmParams } = rest;
  return client.generateJSON<T>({
    ...(llmParams as JSONGenerationParams),
    metadata: {
      ...(metadata ?? {}),
      userId,
    },
  });
}
