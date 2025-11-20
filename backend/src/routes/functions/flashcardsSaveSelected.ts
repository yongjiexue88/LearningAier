import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../../errors";
import {
  createFlashcardGenerationLog,
  createFlashcards,
  createFlashcardSet,
  getNoteById,
  updateFlashcardSet,
  type FlashcardRecord,
} from "../../services/firestore";

type FlashcardCategory = "vocabulary" | "concept" | "code" | "definition";

interface IncomingFlashcard {
  term?: unknown;
  definition?: unknown;
  context?: unknown;
  category?: unknown;
}

const ALLOWED_CATEGORIES: FlashcardCategory[] = [
  "vocabulary",
  "concept",
  "code",
  "definition",
];

export function registerFlashcardsSaveSelectedRoute(router: Router): void {
  router.post(
    "/flashcards-save",
    asyncHandler(async (req, res) => {
      const payload = req.body ?? {};
      const cards = Array.isArray(payload.cards) ? payload.cards : [];
      if (!cards.length) {
        throw new BadRequestError("Field 'cards' must be a non-empty array.");
      }
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

      const model =
        typeof payload.model === "string" && payload.model.trim()
          ? payload.model.trim()
          : null;
      const provider =
        typeof payload.provider === "string" && payload.provider.trim()
          ? payload.provider.trim()
          : null;
      const desiredName =
        typeof payload.name === "string" && payload.name.trim()
          ? payload.name.trim()
          : null;

      const normalized = cards
        .map((card: IncomingFlashcard) => {
          const term =
            typeof card.term === "string" && card.term.trim()
              ? card.term.trim()
              : null;
          const definition =
            typeof card.definition === "string" && card.definition.trim()
              ? card.definition.trim()
              : null;
          if (!term || !definition) return null;
          const context =
            typeof card.context === "string" && card.context.trim()
              ? card.context.trim()
              : null;
          const category = ALLOWED_CATEGORIES.includes(
            card.category as FlashcardCategory
          )
            ? (card.category as FlashcardCategory)
            : "definition";
          return { term, definition, context, category };
        })
        .filter(Boolean) as Array<{
        term: string;
        definition: string;
        context: string | null;
        category: FlashcardCategory;
      }>;

      if (!normalized.length) {
        throw new BadRequestError("No valid cards provided.");
      }

      const set = await createFlashcardSet({
        user_id: userId,
        note_id: note.id,
        name: desiredName || note.title,
        source: "note",
        model,
        provider,
        flashcard_ids: [],
      });

      const now = new Date().toISOString();
      const records = normalized.map((card) => ({
        user_id: userId,
        note_id: note.id,
        document_id: note.source_doc_id ?? null,
        term_zh: card.term,
        term_en: card.term,
        definition_zh: card.definition,
        definition_en: card.definition,
        context_zh: card.context,
        context_en: card.context,
        category: card.category,
        next_due_at: now,
        set_id: set.id,
      }));

      const created = await createFlashcards(records);
      await updateFlashcardSet(set.id, {
        flashcard_ids: created.map((card) => card.id),
      });

      await createFlashcardGenerationLog({
        user_id: userId,
        note_id: note.id,
        status: "success",
        message: `Saved ${created.length} selected flashcards`,
        candidate_count: cards.length,
        generated_count: normalized.length,
        saved_count: created.length,
        set_id: set.id,
        model,
      });

      res.json({
        set_id: set.id,
        flashcards: created as FlashcardRecord[],
        saved_count: created.length,
        model,
      });
    })
  );
}
