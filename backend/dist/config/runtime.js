"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeConfig = void 0;
exports.getEnv = getEnv;
exports.requireEnv = requireEnv;
const loadEnv_1 = require("./loadEnv");
(0, loadEnv_1.loadEnvironment)();
function getEnv(key, fallback) {
    const value = process.env[key];
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return value;
}
function requireEnv(key) {
    const value = getEnv(key);
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
const embeddingsDimensionsRaw = Number(getEnv("EMBEDDINGS_DIMENSIONS", "1536"));
const embeddingsDimensions = Number.isFinite(embeddingsDimensionsRaw)
    ? embeddingsDimensionsRaw
    : 1536;
exports.runtimeConfig = {
    port: Number(getEnv("PORT", "8787")),
    firebaseProjectId: getEnv("FIREBASE_PROJECT_ID") ?? "",
    firebaseClientEmail: getEnv("FIREBASE_CLIENT_EMAIL"),
    firebasePrivateKey: getEnv("FIREBASE_PRIVATE_KEY"),
    firebaseCredentialJson: getEnv("FIREBASE_CREDENTIAL_JSON"),
    firebaseStorageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
    defaultLLMProvider: getEnv("DEFAULT_LLM_PROVIDER", "gemini"),
    defaultLLMModel: getEnv("DEFAULT_LLM_MODEL", "gemini-2.5-flash"),
    llmApiKey: requireEnv("LLM_API_KEY"),
    llmBaseUrl: getEnv("LLM_BASE_URL"),
    embeddingsProvider: getEnv("EMBEDDINGS_PROVIDER"),
    embeddingsModel: getEnv("EMBEDDINGS_MODEL", "text-embedding-004"),
    embeddingsApiKey: getEnv("EMBEDDINGS_API_KEY"),
    embeddingsBaseUrl: getEnv("EMBEDDINGS_BASE_URL"),
    embeddingsDimensions,
};
