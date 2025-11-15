import type { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { AppError, BadRequestError } from "../../errors";
import { runtimeConfig } from "../../config/runtime";

type LanguageCode = "zh" | "en";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  zh: "Chinese",
  en: "English",
};

const aiClient = new GoogleGenAI({
  apiKey: runtimeConfig.llmApiKey,
});

function assertLanguage(value: unknown, field: string): LanguageCode {
  if (value === "zh" || value === "en") {
    return value;
  }
  throw new BadRequestError(`${field} must be 'zh' or 'en'.`);
}

export function registerAiNotesTranslateRoute(router: Router): void {
  router.post(
    "/ai-notes-translate",
    asyncHandler(async (req, res) => {
      console.log("[ai-notes-translate] incoming request");
      const payload = req.body ?? {};
      const targetLanguage = assertLanguage(
        payload.target_language,
        "target_language"
      );

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const noteText =
        typeof payload.text === "string" ? payload.text.trim() : "";
      const noteTitle =
        typeof payload.note_title === "string" && payload.note_title.trim()
          ? payload.note_title.trim()
          : null;
      const noteId =
        typeof payload.note_id === "string" && payload.note_id.trim()
          ? payload.note_id.trim()
          : null;

      if (!noteText) {
        throw new BadRequestError("Field 'text' is required for translation.");
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

      let translatedMarkdown: string;
      try {
        translatedMarkdown = await translateWithGemini({
          text: noteText,
          targetLanguage,
          noteTitle,
        });
      } catch (error) {
        console.error("[ai-notes-translate] LLM call failed", {
          message: (error as Error)?.message,
          stack: (error as Error)?.stack,
        });
        throw new AppError(500, "Translation failed; please try again.");
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
    })
  );
}

async function translateWithGemini({
  text,
  targetLanguage,
  noteTitle,
}: {
  text: string;
  targetLanguage: LanguageCode;
  noteTitle: string | null;
}): Promise<string> {
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
    model: runtimeConfig.defaultLLMModel,
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
