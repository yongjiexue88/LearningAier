import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../../errors";
import {
  createFlashcards,
  getNoteById,
} from "../../services/firestore";
import { generateUserJSON } from "../../services/llm";
import {
  NOTE_FLASHCARD_PROMPT,
  NOTE_FLASHCARD_SCHEMA,
} from "../../llm/prompts";

type FlashcardCategory = "vocabulary" | "concept" | "code" | "definition";

interface FlashcardLLMItem {
  category: FlashcardCategory;
  question: { zh: string; en: string };
  answer: { zh: string; en: string };
  context?: { zh?: string | null; en?: string | null };
  source_heading?: string | null;
}

export function registerAiFlashcardsGenerateRoute(router: Router): void {
  router.post(
    "/ai-flashcards-generate",
    asyncHandler(async (req, res) => {
      const payload = req.body ?? {};
      if (typeof payload.note_id !== "string" || !payload.note_id.trim()) {
        throw new BadRequestError("Field 'note_id' is required.");
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const note = await getNoteById(payload.note_id);
      if (!note) {
        throw new BadRequestError("Note not found.");
      }
      if (note.user_id !== userId) {
        throw new UnauthorizedError();
      }

      const categories = Array.isArray(payload.categories)
        ? (payload.categories.filter((cat: unknown): cat is FlashcardCategory =>
            cat === "vocabulary" ||
            cat === "concept" ||
            cat === "code" ||
            cat === "definition"
          ))
        : undefined;

      const maxCards = Math.min(Math.max(payload.max_cards ?? 16, 4), 32);
      const llmResult = await generateUserJSON<{
        flashcards: FlashcardLLMItem[];
        summary?: string | null;
      }>({
        userId,
        systemPrompt: NOTE_FLASHCARD_PROMPT,
        userPrompt: JSON.stringify({
          note_title: note.title,
          text_zh: note.content_md_zh ?? "",
          text_en: note.content_md_en ?? "",
          max_cards: maxCards,
          categories,
        }),
        schemaName: "NoteFlashcardResult",
        schema: NOTE_FLASHCARD_SCHEMA,
      });

      const llmCards = (llmResult.flashcards ?? []).filter((card) => {
        if (!categories || categories.length === 0) return true;
        return categories.includes(card.category);
      });
      const limitedCards = llmCards.slice(0, maxCards);

      if (!limitedCards.length) {
        res.json({
          note_id: note.id,
          flashcards: [],
          saved_count: 0,
          summary: llmResult.summary ?? null,
        });
        return;
      }

      const persist = payload.persist !== false;
      if (!persist) {
        res.json({
          note_id: note.id,
          flashcards: limitedCards,
          saved_count: 0,
          summary: llmResult.summary ?? null,
        });
        return;
      }

      const records = limitedCards.map((card) => ({
        user_id: userId,
        note_id: note.id,
        document_id: note.source_doc_id ?? null,
        term_zh: card.question.zh,
        term_en: card.question.en,
        definition_zh: card.answer.zh,
        definition_en: card.answer.en,
        context_zh: card.context?.zh ?? card.source_heading ?? null,
        context_en: card.context?.en ?? card.source_heading ?? null,
        category: card.category,
      }));

      const created = await createFlashcards(records);

      res.json({
        note_id: note.id,
        flashcards: created,
        saved_count: created.length,
        summary: llmResult.summary ?? null,
      });
    })
  );
}
