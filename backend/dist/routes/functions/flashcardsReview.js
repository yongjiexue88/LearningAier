"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFlashcardsReviewRoute = registerFlashcardsReviewRoute;
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const firestore_1 = require("../../services/firestore");
const INTERVAL_MULTIPLIERS = {
    again: 0.5,
    hard: 1,
    good: 2,
    easy: 3,
};
function registerFlashcardsReviewRoute(router) {
    router.post("/flashcards-review", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { flashcard_id, response } = req.body ?? {};
        if (typeof flashcard_id !== "string" || !flashcard_id.trim()) {
            throw new errors_1.BadRequestError("Field 'flashcard_id' is required.");
        }
        if (!response || !(response in INTERVAL_MULTIPLIERS)) {
            throw new errors_1.BadRequestError("Field 'response' must be one of again|hard|good|easy.");
        }
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const card = await (0, firestore_1.getFlashcardById)(flashcard_id);
        if (!card) {
            throw new errors_1.BadRequestError("Flashcard not found.");
        }
        if (card.user_id !== userId) {
            throw new errors_1.UnauthorizedError();
        }
        const typedResponse = response;
        const lastReview = await (0, firestore_1.getLatestFlashcardReview)(card.id);
        const baseInterval = lastReview?.interval_days ?? 1;
        const multiplier = INTERVAL_MULTIPLIERS[typedResponse];
        const nextInterval = Math.max(1, Math.round(baseInterval * multiplier));
        const nextDueAt = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();
        await (0, firestore_1.createFlashcardReview)({
            flashcard_id: card.id,
            user_id: userId,
            response: typedResponse,
            reviewed_at: new Date().toISOString(),
            next_due_at: nextDueAt,
            interval_days: nextInterval,
        });
        await (0, firestore_1.updateFlashcard)(card.id, { next_due_at: nextDueAt });
        res.json({
            flashcard_id: card.id,
            next_due_at: nextDueAt,
            interval_days: nextInterval,
        });
    }));
}
