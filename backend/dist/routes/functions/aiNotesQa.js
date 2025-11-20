"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAiNotesQaRoute = registerAiNotesQaRoute;
const genai_1 = require("@google/genai");
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const runtime_1 = require("../../config/runtime");
const aiClient = new genai_1.GoogleGenAI({
    apiKey: runtime_1.runtimeConfig.llmApiKey,
});
function registerAiNotesQaRoute(router) {
    router.post("/ai-notes-qa", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payload = req.body ?? {};
        if (typeof payload.question !== "string" || !payload.question.trim()) {
            throw new errors_1.BadRequestError("Field 'question' is required.");
        }
        if (!payload.scope || typeof payload.scope !== "object") {
            throw new errors_1.BadRequestError("Field 'scope' is required.");
        }
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const history = sanitizeHistory(payload.history);
        const answerText = await generateGeminiResponse({
            question: payload.question,
            history,
        });
        res.json({
            answer: answerText,
            history,
        });
    }));
}
function sanitizeHistory(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }
    return messages
        .filter((msg) => (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0)
        .slice(-6)
        .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
        language: msg.language === "zh" || msg.language === "en"
            ? msg.language
            : undefined,
    }));
}
async function generateGeminiResponse({ question, history, }) {
    const contents = history.length > 0
        ? [
            ...history.map((msg) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
            })),
            { role: "user", parts: [{ text: question }] },
        ]
        : [{ role: "user", parts: [{ text: question }] }];
    try {
        const response = await aiClient.models.generateContent({
            model: runtime_1.runtimeConfig.defaultLLMModel,
            contents,
            config: {
                temperature: 0.3,
                maxOutputTokens: 1024,
            },
        });
        const text = response.text?.trim() ||
            response.candidates
                ?.map((candidate) => candidate.content?.parts
                ?.map((part) => part?.text ?? "")
                .join("\n")
                .trim())
                .find((val) => Boolean(val)) ||
            "";
        if (text) {
            return text;
        }
    }
    catch (error) {
        console.error("[ai-notes-qa] Gemini call failed", {
            message: error?.message,
            stack: error?.stack,
        });
    }
    return "I couldn't generate an answer this time. Please try again in a moment or rephrase your question.";
}
