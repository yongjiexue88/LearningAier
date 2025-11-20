"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAiNotesTranslateRoute = registerAiNotesTranslateRoute;
const genai_1 = require("@google/genai");
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const runtime_1 = require("../../config/runtime");
const LANGUAGE_LABELS = {
    zh: "Chinese",
    en: "English",
};
const aiClient = new genai_1.GoogleGenAI({
    apiKey: runtime_1.runtimeConfig.llmApiKey,
});
function assertLanguage(value, field) {
    if (value === "zh" || value === "en") {
        return value;
    }
    throw new errors_1.BadRequestError(`${field} must be 'zh' or 'en'.`);
}
function registerAiNotesTranslateRoute(router) {
    router.post("/ai-notes-translate", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        console.log("[ai-notes-translate] incoming request");
        const payload = req.body ?? {};
        const targetLanguage = assertLanguage(payload.target_language, "target_language");
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const noteText = typeof payload.text === "string" ? payload.text.trim() : "";
        const noteTitle = typeof payload.note_title === "string" && payload.note_title.trim()
            ? payload.note_title.trim()
            : null;
        const noteId = typeof payload.note_id === "string" && payload.note_id.trim()
            ? payload.note_id.trim()
            : null;
        if (!noteText) {
            throw new errors_1.BadRequestError("Field 'text' is required for translation.");
        }
        const textPreview = noteText.slice(0, 200);
        console.log("[ai-notes-translate] request", {
            userId,
            targetLanguage,
            noteId,
            noteTitle,
            textLength: noteText.length,
            textPreview,
        });
        let translatedMarkdown;
        try {
            translatedMarkdown = await translateWithGemini({
                text: noteText,
                targetLanguage,
                noteTitle,
            });
        }
        catch (error) {
            console.error("[ai-notes-translate] LLM call failed", {
                message: error?.message,
                stack: error?.stack,
            });
            throw new errors_1.AppError(500, "Translation failed; please try again.");
        }
        console.log("[ai-notes-translate] success", {
            userId,
            noteId,
            targetLanguage,
            outputLength: translatedMarkdown.length,
            outputPreview: translatedMarkdown.slice(0, 200),
        });
        res.json({
            note_id: noteId,
            target_language: targetLanguage,
            translated_markdown: translatedMarkdown,
        });
    }));
}
async function translateWithGemini({ text, targetLanguage, noteTitle, }) {
    const prompt = [
        "You are a concise translation assistant for study notes.",
        `Translate the provided markdown into ${LANGUAGE_LABELS[targetLanguage]} while keeping all Markdown structure intact (headings, lists, tables, math fences, code fences).`,
        "Keep code fences verbatim unless translating inline comments/docstrings is clearly safe.",
        "Preserve spacing/indentation and return ONLY the translated markdown, no explanations.",
        noteTitle ? `Note title: "${noteTitle}".` : null,
        "",
        "Translate this note:",
        "--- START OF NOTE ---",
        text,
        "--- END OF NOTE ---",
    ]
        .filter((line) => line !== null)
        .join("\n");
    const response = await aiClient.models.generateContent({
        model: runtime_1.runtimeConfig.defaultLLMModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            temperature: 0.2,
            maxOutputTokens: 4096,
        },
    });
    const translated = response.text?.trim();
    if (!translated) {
        throw new Error("Gemini returned an empty translation.");
    }
    return translated;
}
