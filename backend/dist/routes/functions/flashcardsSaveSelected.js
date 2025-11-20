"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFlashcardsSaveSelectedRoute = registerFlashcardsSaveSelectedRoute;
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const firestore_1 = require("../../services/firestore");
const ALLOWED_CATEGORIES = [
    "vocabulary",
    "concept",
    "code",
    "definition",
];
function registerFlashcardsSaveSelectedRoute(router) {
    router.post("/flashcards-save", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payload = req.body ?? {};
        const cards = Array.isArray(payload.cards) ? payload.cards : [];
        if (!cards.length) {
            throw new errors_1.BadRequestError("Field 'cards' must be a non-empty array.");
        }
        if (typeof payload.note_id !== "string" || !payload.note_id.trim()) {
            throw new errors_1.BadRequestError("Field 'note_id' is required.");
        }
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const note = await (0, firestore_1.getNoteById)(payload.note_id);
        if (!note) {
            throw new errors_1.BadRequestError("Note not found.");
        }
        if (note.user_id !== userId) {
            throw new errors_1.UnauthorizedError();
        }
        const model = typeof payload.model === "string" && payload.model.trim()
            ? payload.model.trim()
            : null;
        const provider = typeof payload.provider === "string" && payload.provider.trim()
            ? payload.provider.trim()
            : null;
        const desiredName = typeof payload.name === "string" && payload.name.trim()
            ? payload.name.trim()
            : null;
        const normalized = cards
            .map((card) => {
            const term = typeof card.term === "string" && card.term.trim()
                ? card.term.trim()
                : null;
            const definition = typeof card.definition === "string" && card.definition.trim()
                ? card.definition.trim()
                : null;
            if (!term || !definition)
                return null;
            const context = typeof card.context === "string" && card.context.trim()
                ? card.context.trim()
                : null;
            const category = ALLOWED_CATEGORIES.includes(card.category)
                ? card.category
                : "definition";
            return { term, definition, context, category };
        })
            .filter(Boolean);
        if (!normalized.length) {
            throw new errors_1.BadRequestError("No valid cards provided.");
        }
        const set = await (0, firestore_1.createFlashcardSet)({
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
        const created = await (0, firestore_1.createFlashcards)(records);
        await (0, firestore_1.updateFlashcardSet)(set.id, {
            flashcard_ids: created.map((card) => card.id),
        });
        await (0, firestore_1.createFlashcardGenerationLog)({
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
            flashcards: created,
            saved_count: created.length,
            model,
        });
    }));
}
