import { runtimeConfig } from "../config/runtime";
import { getProfileById } from "./firestore";
import { LLMClient, type JSONGenerationParams } from "../llm/client";

const runtime = runtimeConfig;

export interface UserScopedLLMParams extends JSONGenerationParams {
  userId: string;
}

async function getLLMClient(userId: string): Promise<LLMClient> {
  const profile = await getProfileById(userId);
  const providerSource = profile?.llm_provider ?? runtime.defaultLLMProvider;
  const provider = providerSource.toLowerCase();
  return new LLMClient({
    provider,
    model: profile?.llm_model ?? runtime.defaultLLMModel,
    apiKey: runtime.llmApiKey,
    baseUrl: runtime.llmBaseUrl,
  });
}

export async function generateUserJSON<T>(
  params: UserScopedLLMParams
): Promise<T> {
  const { userId, ...rest } = params;
  const client = await getLLMClient(userId);
  const { metadata, ...llmParams } = rest;
  return client.generateJSON<T>({
    ...(llmParams as JSONGenerationParams),
    metadata: {
      ...(metadata ?? {}),
      userId,
    },
  });
}
