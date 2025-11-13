import { getRuntimeConfig } from "./env.ts";

export async function embedTexts(
  texts: string[],
  options?: { model?: string }
): Promise<number[][]> {
  if (!texts.length) return [];
  const runtime = getRuntimeConfig();
  const model = options?.model ?? runtime.embeddingsModel;
  const apiKey = runtime.embeddingsApiKey ?? runtime.llmApiKey;
  const baseUrl =
    runtime.embeddingsBaseUrl ??
    (runtime.defaultLLMProvider === "openai"
      ? "https://api.openai.com/v1/embeddings"
      : "https://api.openai.com/v1/embeddings");

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding request failed: ${errorBody}`);
  }

  const payload = await response.json();
  return (payload.data ?? []).map((item: any) => item.embedding as number[]);
}
