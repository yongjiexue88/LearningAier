"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAiFlashcardsGenerateRoute = registerAiFlashcardsGenerateRoute;
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const firestore_1 = require("../../services/firestore");
const llm_1 = require("../../services/llm");
const prompts_1 = require("../../llm/prompts");
function registerAiFlashcardsGenerateRoute(router) {
    router.post("/ai-flashcards-generate", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payload = req.body ?? {};
        if (typeof payload.note_id !== "string" || !payload.note_id.trim()) {
            throw new errors_1.BadRequestError("Field 'note_id' is required.");
        }
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const requestedModel = typeof payload.model === "string" && payload.model.trim()
            ? payload.model.trim()
            : undefined;
        const requestedProvider = typeof payload.provider === "string" && payload.provider.trim()
            ? payload.provider.trim()
            : undefined;
        const note = await (0, firestore_1.getNoteById)(payload.note_id);
        if (!note) {
            throw new errors_1.BadRequestError("Note not found.");
        }
        if (note.user_id !== userId) {
            throw new errors_1.UnauthorizedError();
        }
        const logPrefix = `[ai-flashcards-generate][user=${userId}][note=${note.id}]`;
        try {
            const categories = Array.isArray(payload.categories)
                ? (payload.categories.filter((cat) => cat === "vocabulary" ||
                    cat === "concept" ||
                    cat === "code" ||
                    cat === "definition"))
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
            const keywordResult = await (0, llm_1.generateUserJSON)({
                userId,
                model: requestedModel,
                provider: requestedProvider,
                systemPrompt: prompts_1.NOTE_FLASHCARD_KEYWORDS_PROMPT,
                userPrompt: keywordUserPrompt,
                schemaName: "NoteFlashcardKeywordsResult",
                schema: prompts_1.NOTE_FLASHCARD_KEYWORDS_SCHEMA,
            });
            const keywords = (keywordResult.keywords ?? []).filter((kw) => {
                if (!categories || categories.length === 0)
                    return true;
                return categories.includes(kw.category);
            });
            const dedupedKeywords = [];
            const seen = new Set();
            for (const kw of keywords) {
                const key = (kw.term ?? "").toLowerCase().trim();
                if (key.trim() === "" || seen.has(key))
                    continue;
                seen.add(key);
                dedupedKeywords.push(kw);
            }
            const limitedKeywords = dedupedKeywords.slice(0, maxCards);
            const cardResults = [];
            for (const kw of limitedKeywords) {
                try {
                    console.info(`${logPrefix} generating card`, {
                        term: kw.term,
                        category: kw.category,
                    });
                    const cardResult = await (0, llm_1.generateUserJSON)({
                        userId,
                        model: requestedModel,
                        provider: requestedProvider,
                        systemPrompt: prompts_1.NOTE_FLASHCARD_CARD_PROMPT,
                        userPrompt: JSON.stringify({
                            note_title: note.title,
                            note_text: combinedText,
                            term: kw.term,
                            category: kw.category,
                            reason: kw.reason,
                        }),
                        schemaName: "NoteFlashcardCardResult",
                        schema: prompts_1.NOTE_FLASHCARD_CARD_SCHEMA,
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
                }
                catch (error) {
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
                await (0, firestore_1.createFlashcardGenerationLog)({
                    user_id: userId,
                    note_id: note.id,
                    status: "empty",
                    message: "No flashcards generated",
                    candidate_count: keywords.length,
                    generated_count: 0,
                    saved_count: 0,
                    model: requestedModel ?? null,
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
                await (0, firestore_1.createFlashcardGenerationLog)({
                    user_id: userId,
                    note_id: note.id,
                    status: "preview",
                    message: "Generated flashcards (preview only)",
                    candidate_count: keywords.length,
                    generated_count: limitedRecords.length,
                    saved_count: 0,
                    model: requestedModel ?? null,
                });
                res.json({
                    note_id: note.id,
                    flashcards: limitedRecords,
                    saved_count: 0,
                    model: requestedModel ?? null,
                    summary: null,
                });
                return;
            }
            const set = await (0, firestore_1.createFlashcardSet)({
                user_id: userId,
                note_id: note.id,
                name: note.title,
                source: "note",
                model: requestedModel ?? null,
                provider: requestedProvider ?? null,
                flashcard_ids: [],
            });
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
                category: card.category,
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
                message: `Generated ${created.length} flashcards`,
                candidate_count: keywords.length,
                generated_count: limitedCards.length,
                saved_count: created.length,
                set_id: set.id,
                model: requestedModel ?? null,
            });
            res.json({
                note_id: note.id,
                flashcards: created,
                saved_count: created.length,
                set_id: set.id,
                model: requestedModel ?? null,
                summary: null,
            });
        }
        catch (error) {
            console.error("[ai-flashcards-generate] failed", {
                userId,
                noteId: note.id,
                error: error?.message ?? String(error),
            });
            await (0, firestore_1.createFlashcardGenerationLog)({
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
    }));
}
