"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotesReindexRoute = registerNotesReindexRoute;
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const firestore_1 = require("../../services/firestore");
const chunking_1 = require("../../embeddings/chunking");
const embeddings_1 = require("../../services/embeddings");
const runtime_1 = require("../../config/runtime");
function registerNotesReindexRoute(router) {
    router.post("/notes-reindex", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { note_id } = req.body ?? {};
        if (typeof note_id !== "string" || !note_id.trim()) {
            throw new errors_1.BadRequestError("Field 'note_id' is required.");
        }
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const note = await (0, firestore_1.getNoteById)(note_id);
        if (!note) {
            throw new errors_1.BadRequestError("Note not found.");
        }
        if (note.user_id !== userId) {
            throw new errors_1.UnauthorizedError();
        }
        const content = note.content_md_en ?? note.content_md_zh ?? "";
        const chunks = (0, chunking_1.chunkMarkdown)(content);
        if (!chunks.length) {
            throw new errors_1.BadRequestError("Note has no content to index.");
        }
        const embeddings = await (0, embeddings_1.embedTexts)(chunks.map((chunk) => chunk.text));
        if (embeddings.length !== chunks.length) {
            throw new Error("Embeddings count mismatch.");
        }
        await (0, firestore_1.replaceNoteChunks)(note.id, userId, chunks.map((chunk, idx) => ({
            content: chunk.text,
            embedding: embeddings[idx],
            position: chunk.position,
        })));
        res.json({
            note_id: note.id,
            chunks_processed: chunks.length,
            embedding_model: runtime_1.runtimeConfig.embeddingsModel,
        });
    }));
}
