"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMClient = void 0;
const genai_1 = require("@google/genai");
const jsonrepair_1 = require("jsonrepair");
class LLMClient {
    config;
    googleClient;
    constructor(config) {
        this.config = config;
        if (!config.apiKey) {
            throw new Error("Missing LLM API key");
        }
        if (!config.model) {
            throw new Error("Missing LLM model");
        }
    }
    async generateJSON(params) {
        switch (this.config.provider) {
            case "openai":
                return this.generateViaOpenAI(params);
            case "gemini":
            case "google":
                return this.generateViaGemini(params);
            default:
                return this.generateViaOpenAICompatible(params);
        }
    }
    getGoogleClient() {
        if (!this.googleClient) {
            this.googleClient = new genai_1.GoogleGenAI({
                apiKey: this.config.apiKey,
            });
        }
        return this.googleClient;
    }
    async generateViaOpenAI(params) {
        const response = await fetch(this.config.baseUrl ?? "https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model: this.config.model,
                temperature: params.temperature ?? 0.2,
                max_output_tokens: params.maxOutputTokens ?? 1024,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: params.schemaName,
                        schema: params.schema,
                        strict: true,
                    },
                },
                messages: [
                    { role: "system", content: params.systemPrompt.trim() },
                    { role: "user", content: params.userPrompt.trim() },
                ],
                metadata: params.metadata,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
        }
        const json = await response.json();
        const content = json?.output?.[0]?.content?.[0]?.text ?? json?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
            throw new Error("LLM response missing text content");
        }
        return JSON.parse(content);
    }
    // Works for providers that implement the Chat Completions API w/ JSON mode.
    async generateViaOpenAICompatible(params) {
        const response = await fetch(this.config.baseUrl ?? "https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model: this.config.model,
                temperature: params.temperature ?? 0.2,
                max_tokens: params.maxOutputTokens ?? 1024,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: params.systemPrompt.trim() },
                    { role: "user", content: params.userPrompt.trim() },
                ],
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`${this.config.provider} request failed (${response.status}): ${errorBody}`);
        }
        const json = await response.json();
        const content = json?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
            throw new Error("LLM response missing text content");
        }
        return JSON.parse(content);
    }
    async generateViaGemini(params) {
        const client = this.getGoogleClient();
        const response = await client.models.generateContent({
            model: this.config.model,
            contents: [
                { role: "user", parts: [{ text: params.userPrompt.trim() }] },
            ],
            config: {
                systemInstruction: {
                    role: "system",
                    parts: [{ text: params.systemPrompt.trim() }],
                },
                responseMimeType: "application/json",
                responseJsonSchema: params.schema,
                temperature: params.temperature ?? 0.2,
                maxOutputTokens: params.maxOutputTokens ?? 1024,
            },
        });
        const root = response.response ?? response;
        const textFn = typeof root?.text === "function" ? root.text() : undefined;
        const partsText = root?.candidates?.[0]?.content?.parts
            ?.map((part) => {
            if (typeof part === "string")
                return part;
            if (part?.text && typeof part.text === "string")
                return part.text;
            if (part?.inlineData?.data && typeof part.inlineData.data === "string") {
                return part.inlineData.data;
            }
            return "";
        })
            .join("")
            .trim() ?? "";
        const text = (textFn ?? "").trim() || partsText;
        if (!text) {
            throw new Error("Gemini response missing text content");
        }
        const cleaned = text
            .trim()
            .replace(/^```(?:json)?/i, "")
            .replace(/```$/, "")
            .trim();
        const tryParse = (input) => {
            try {
                return { ok: true, value: JSON.parse(input) };
            }
            catch {
                return { ok: false };
            }
        };
        const parsedDirect = tryParse(cleaned);
        if (parsedDirect.ok) {
            return parsedDirect.value;
        }
        const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            const parsedMatch = tryParse(jsonMatch[0]);
            if (parsedMatch.ok) {
                return parsedMatch.value;
            }
        }
        try {
            const repaired = (0, jsonrepair_1.jsonrepair)(cleaned);
            const parsedRepaired = JSON.parse(repaired);
            return parsedRepaired;
        }
        catch {
            // fall through
        }
        throw new Error(`Gemini response was not valid JSON: ${text}`);
    }
}
exports.LLMClient = LLMClient;
