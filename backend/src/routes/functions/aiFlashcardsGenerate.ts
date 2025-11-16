import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../../errors";
import {
  createFlashcards,
  createFlashcardGenerationLog,
  getNoteById,
} from "../../services/firestore";
import { generateUserJSON } from "../../services/llm";
import {
  NOTE_FLASHCARD_KEYWORDS_PROMPT,
  NOTE_FLASHCARD_KEYWORDS_SCHEMA,
  NOTE_FLASHCARD_CARD_PROMPT,
  NOTE_FLASHCARD_CARD_SCHEMA,
} from "../../llm/prompts";

type FlashcardCategory = "vocabulary" | "concept" | "code" | "definition";

interface FlashcardKeywordLLMItem {
  term: string;
  category: FlashcardCategory;
  reason: string;
}

interface FlashcardCardLLMItem {
  term: string;
  definition: string;
  context: string | null;
  category: FlashcardCategory;
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

      const logPrefix = `[ai-flashcards-generate][user=${userId}][note=${note.id}]`;

      try {
        const categories = Array.isArray(payload.categories)
          ? (payload.categories.filter((cat: unknown): cat is FlashcardCategory =>
              cat === "vocabulary" ||
              cat === "concept" ||
              cat === "code" ||
              cat === "definition"
            ))
          : undefined;

        const maxCards = Math.min(Math.max(payload.max_cards ?? 16, 4), 32);
        const combinedText = note.content_md_en ?? note.content_md_zh ?? "";
        const keywordUserPrompt = JSON.stringify({
          note_title: note.title,
          note_text: combinedText,
          max_terms: maxCards,
          categories,
        });
        console.info(`${logPrefix} requesting keywords`, {
          maxCards,
          categories,
          promptPreview: keywordUserPrompt.slice(0, 200),
          textLength: combinedText.length,
        });
        const keywordResult = await generateUserJSON<{
          keywords: FlashcardKeywordLLMItem[];
        }>({
          userId,
          systemPrompt: NOTE_FLASHCARD_KEYWORDS_PROMPT,
          userPrompt: keywordUserPrompt,
          schemaName: "NoteFlashcardKeywordsResult",
          schema: NOTE_FLASHCARD_KEYWORDS_SCHEMA,
        });

        const keywords = (keywordResult.keywords ?? []).filter((kw) => {
          if (!categories || categories.length === 0) return true;
          return categories.includes(kw.category);
        });

        const dedupedKeywords: FlashcardKeywordLLMItem[] = [];
        const seen = new Set<string>();
        for (const kw of keywords) {
          const key = (kw.term ?? "").toLowerCase().trim();
          if (key.trim() === "" || seen.has(key)) continue;
          seen.add(key);
          dedupedKeywords.push(kw);
        }

        const limitedKeywords = dedupedKeywords.slice(0, maxCards);
        const cardResults: FlashcardCardLLMItem[] = [];

        for (const kw of limitedKeywords) {
          try {
            console.info(`${logPrefix} generating card`, {
              term: kw.term,
              category: kw.category,
            });
            const cardResult = await generateUserJSON<{ flashcard: FlashcardCardLLMItem }>({
              userId,
              systemPrompt: NOTE_FLASHCARD_CARD_PROMPT,
              userPrompt: JSON.stringify({
                note_title: note.title,
                note_text: combinedText,
                term: kw.term,
                category: kw.category,
                reason: kw.reason,
              }),
              schemaName: "NoteFlashcardCardResult",
              schema: NOTE_FLASHCARD_CARD_SCHEMA,
            });
            const card = cardResult.flashcard;
            cardResults.push({
              category: card.category,
              term: card.term,
              definition: card.definition,
              context: card.context,
            });
            console.info(`${logPrefix} card created`, {
              term: card.term,
              category: card.category,
              contextPreview: (card.context ?? "")?.slice(0, 120),
            });
          } catch (error: any) {
            console.error("[ai-flashcards-generate] card generation failed", {
              userId,
              noteId: note.id,
              term: kw.term,
              error: error?.message ?? String(error),
            });
          }
        }

        console.info(`${logPrefix} keyword summary`, {
          keywords: limitedKeywords.map((kw) => kw.term),
          generated: cardResults.length,
        });

        const limitedCards = cardResults.slice(0, maxCards);

        const limitedRecords = limitedCards.map((card) => ({
          category: card.category,
          term_zh: card.term,
          term_en: card.term,
          definition_zh: card.definition,
          definition_en: card.definition,
          context_zh: card.context,
          context_en: card.context,
        }));

        if (!limitedRecords.length) {
          await createFlashcardGenerationLog({
            user_id: userId,
            note_id: note.id,
            status: "empty",
            message: "No flashcards generated",
            candidate_count: keywords.length,
            generated_count: 0,
            saved_count: 0,
          });
          res.json({
            note_id: note.id,
            flashcards: [],
            saved_count: 0,
            summary: null,
          });
          return;
        }

        const persist = payload.persist !== false;
        if (!persist) {
          await createFlashcardGenerationLog({
            user_id: userId,
            note_id: note.id,
            status: "preview",
            message: "Generated flashcards (preview only)",
            candidate_count: keywords.length,
            generated_count: limitedRecords.length,
            saved_count: 0,
          });
          res.json({
            note_id: note.id,
            flashcards: limitedRecords,
            saved_count: 0,
            summary: null,
          });
          return;
        }

        const records = limitedRecords.map((card) => ({
          user_id: userId,
          note_id: note.id,
          document_id: note.source_doc_id ?? null,
          term_zh: card.term_zh,
          term_en: card.term_en,
          definition_zh: card.definition_zh,
          definition_en: card.definition_en,
          context_zh: card.context_zh ?? null,
          context_en: card.context_en ?? null,
          category: card.category as FlashcardCategory,
        }));

        const created = await createFlashcards(records);

        await createFlashcardGenerationLog({
          user_id: userId,
          note_id: note.id,
          status: "success",
          message: `Generated ${created.length} flashcards`,
          candidate_count: keywords.length,
          generated_count: limitedCards.length,
          saved_count: created.length,
        });

        res.json({
          note_id: note.id,
          flashcards: created,
          saved_count: created.length,
          summary: null,
        });
      } catch (error: any) {
        console.error("[ai-flashcards-generate] failed", {
          userId,
          noteId: note.id,
          error: error?.message ?? String(error),
        });
        await createFlashcardGenerationLog({
          user_id: userId,
          note_id: note.id,
          status: "error",
          message: error?.message ?? "Unknown flashcard generation error",
          candidate_count: 0,
          generated_count: 0,
          saved_count: 0,
        });
        throw error;
      }
    })
  );
}
