"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedTexts = embedTexts;
const genai_1 = require("@google/genai");
const runtime_1 = require("../config/runtime");
const GEMINI_EMBEDDING_DIMENSIONS = 1536;
async function embedTexts(texts, options) {
    if (!texts.length)
        return [];
    const runtime = runtime_1.runtimeConfig;
    const model = options?.model ?? runtime.embeddingsModel;
    const apiKey = runtime.embeddingsApiKey ?? runtime.llmApiKey;
    const dimensions = runtime.embeddingsDimensions;
    const providerSource = runtime.embeddingsProvider ?? runtime.defaultLLMProvider;
    const provider = providerSource.toLowerCase();
    if (provider === "gemini" || provider === "google") {
        return embedWithGemini({ texts, model, apiKey, dimensions });
    }
    return embedWithOpenAICompatible({
        texts,
        model,
        apiKey,
        baseUrl: runtime.embeddingsBaseUrl ?? "https://api.openai.com/v1/embeddings",
        dimensions,
    });
}
async function embedWithGemini({ texts, model, apiKey, dimensions, }) {
    const client = new genai_1.GoogleGenAI({ apiKey });
    const results = await Promise.all(texts.map(async (text) => {
        const payload = {
            model,
            outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
            contents: [
                {
                    role: "user",
                    parts: [{ text }],
                },
            ],
            config: {
                outputDimensionality: dimensions,
            },
        };
        const response = await client.models.embedContent(payload);
        const embedding = response.embeddings?.[0]?.values;
        if (!embedding) {
            throw new Error("Gemini embeddings response missing vector values");
        }
        return normalizeEmbedding(embedding, dimensions);
    }));
    return results;
}
async function embedWithOpenAICompatible({ texts, model, apiKey, baseUrl, dimensions, }) {
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
    return (payload.data ?? []).map((item) => normalizeEmbedding(item.embedding, dimensions));
}
function normalizeEmbedding(vector, dimensions) {
    if (!Array.isArray(vector)) {
        throw new Error("Embedding payload missing vector array");
    }
    if (vector.length === dimensions) {
        return vector;
    }
    if (vector.length > dimensions) {
        return vector.slice(0, dimensions);
    }
    const padded = vector.slice();
    while (padded.length < dimensions) {
        padded.push(0);
    }
    return padded;
}
