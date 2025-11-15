import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../../errors";
import {
  createFlashcardReview,
  getFlashcardById,
  getLatestFlashcardReview,
  updateFlashcard,
} from "../../services/firestore";

type ReviewResponse = "again" | "hard" | "good" | "easy";

const INTERVAL_MULTIPLIERS: Record<ReviewResponse, number> = {
  again: 0.5,
  hard: 1,
  good: 2,
  easy: 3,
};

export function registerFlashcardsReviewRoute(router: Router): void {
  router.post(
    "/flashcards-review",
    asyncHandler(async (req, res) => {
      const { flashcard_id, response } = req.body ?? {};
      if (typeof flashcard_id !== "string" || !flashcard_id.trim()) {
        throw new BadRequestError("Field 'flashcard_id' is required.");
      }
      if (!response || !(response in INTERVAL_MULTIPLIERS)) {
        throw new BadRequestError(
          "Field 'response' must be one of again|hard|good|easy."
        );
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const card = await getFlashcardById(flashcard_id);
      if (!card) {
        throw new BadRequestError("Flashcard not found.");
      }
      if (card.user_id !== userId) {
        throw new UnauthorizedError();
      }

      const typedResponse = response as ReviewResponse;
      const lastReview = await getLatestFlashcardReview(card.id);
      const baseInterval = lastReview?.interval_days ?? 1;
      const multiplier = INTERVAL_MULTIPLIERS[typedResponse];
      const nextInterval = Math.max(1, Math.round(baseInterval * multiplier));
      const nextDueAt = new Date(
        Date.now() + nextInterval * 24 * 60 * 60 * 1000
      ).toISOString();

      await createFlashcardReview({
        flashcard_id: card.id,
        user_id: userId,
        response: typedResponse,
        reviewed_at: new Date().toISOString(),
        next_due_at: nextDueAt,
        interval_days: nextInterval,
      });

      await updateFlashcard(card.id, { next_due_at: nextDueAt });

      res.json({
        flashcard_id: card.id,
        next_due_at: nextDueAt,
        interval_days: nextInterval,
      });
    })
  );
}
