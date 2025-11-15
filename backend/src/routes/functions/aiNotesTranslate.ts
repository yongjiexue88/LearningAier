import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../../errors";
import { generateUserJSON } from "../../services/llm";
import {
  NOTE_TRANSLATION_PROMPT,
  NOTE_TRANSLATION_SCHEMA,
} from "../../llm/prompts";
import { getNoteById } from "../../services/firestore";

type LanguageCode = "zh" | "en";
type TranslationMode = "translate" | "compare" | "sync";

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
      const payload = req.body ?? {};
      const sourceLanguage = assertLanguage(
        payload.source_language,
        "source_language"
      );
      const targetLanguage = assertLanguage(
        payload.target_language,
        "target_language"
      );

      if (sourceLanguage === targetLanguage) {
        throw new BadRequestError(
          "source_language and target_language must differ."
        );
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      let sourceText =
        typeof payload.source_text === "string"
          ? payload.source_text.trim()
          : "";
      let targetText =
        typeof payload.target_text === "string"
          ? payload.target_text.trim()
          : "";
      let noteTitle: string | null = null;

      if (typeof payload.note_id === "string" && payload.note_id.trim()) {
        const note = await getNoteById(payload.note_id);
        if (!note) {
          throw new BadRequestError("Note not found.");
        }
        if (note.user_id !== userId) {
          throw new UnauthorizedError();
        }
        noteTitle = note.title;
        if (!sourceText) {
          sourceText =
            sourceLanguage === "zh"
              ? note.content_md_zh ?? ""
              : note.content_md_en ?? "";
        }
        if (!targetText) {
          targetText =
            targetLanguage === "zh"
              ? note.content_md_zh ?? ""
              : note.content_md_en ?? "";
        }
      }

      if (!sourceText.trim()) {
        throw new BadRequestError(
          "source_text is required when the note is empty."
        );
      }

      const mode: TranslationMode =
        payload.mode === "compare" || payload.mode === "sync"
          ? payload.mode
          : "translate";
      const translation = await generateUserJSON({
        userId,
        systemPrompt: NOTE_TRANSLATION_PROMPT,
        userPrompt: JSON.stringify({
          mode,
          note_title: noteTitle,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          source_text: sourceText,
          target_text: targetText,
        }),
        schemaName: "NoteTranslationResult",
        schema: NOTE_TRANSLATION_SCHEMA,
      });

      res.json({
        note_id: typeof payload.note_id === "string" ? payload.note_id : null,
        mode,
        result: translation,
      });
    })
  );
}
