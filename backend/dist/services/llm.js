"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUserJSON = generateUserJSON;
const runtime_1 = require("../config/runtime");
const firestore_1 = require("./firestore");
const client_1 = require("../llm/client");
const runtime = runtime_1.runtimeConfig;
async function getLLMClient(userId, overrides) {
    const profile = await (0, firestore_1.getProfileById)(userId);
    const providerSource = overrides?.provider ??
        profile?.llm_provider ??
        runtime.defaultLLMProvider;
    const provider = providerSource.toLowerCase();
    return new client_1.LLMClient({
        provider,
        model: overrides?.model ?? profile?.llm_model ?? runtime.defaultLLMModel,
        apiKey: runtime.llmApiKey,
        baseUrl: runtime.llmBaseUrl,
    });
}
async function generateUserJSON(params) {
    const { userId, model, provider, ...rest } = params;
    const client = await getLLMClient(userId, { model, provider });
    const { metadata, ...llmParams } = rest;
    return client.generateJSON({
        ...llmParams,
        metadata: {
            ...(metadata ?? {}),
            userId,
        },
    });
}
