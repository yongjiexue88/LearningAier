"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveScopeNoteIds = resolveScopeNoteIds;
exports.retrieveContextChunks = retrieveContextChunks;
const firestore_1 = require("./firestore");
const errors_1 = require("../errors");
async function resolveScopeNoteIds(userId, scope) {
    if (scope.type === "all") {
        return null;
    }
    if (!scope.id) {
        throw new errors_1.BadRequestError("Scope id is required");
    }
    if (scope.type === "note") {
        const note = await (0, firestore_1.getNoteById)(scope.id);
        if (!note || note.user_id !== userId) {
            throw new errors_1.BadRequestError("Note not found or unauthorized");
        }
        return [note.id];
    }
    // Folder scope
    const notes = await (0, firestore_1.listNotesByFolder)(userId, scope.id);
    return notes.map((note) => note.id);
}
async function retrieveContextChunks({ userId, scope, queryEmbedding, matchCount = 8, matchThreshold = 0.4, }) {
    const noteIds = await resolveScopeNoteIds(userId, scope);
    let chunks = [];
    if (noteIds === null) {
        chunks = await (0, firestore_1.listUserNoteChunks)(userId);
    }
    else if (noteIds.length > 0) {
        chunks = await (0, firestore_1.listNoteChunksByNoteIds)(noteIds);
    }
    else {
        return [];
    }
    const minSimilarity = 1 - matchThreshold;
    const scored = chunks
        .filter((chunk) => chunk.user_id === userId)
        .map((chunk) => ({
        chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
        .filter(({ similarity }) => similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, matchCount);
    if (!scored.length) {
        return [];
    }
    const noteIdSet = Array.from(new Set(scored.map(({ chunk }) => chunk.note_id)));
    const notes = await (0, firestore_1.listNotesByIds)(noteIdSet);
    const docIds = Array.from(new Set(notes.map((note) => note.source_doc_id).filter(Boolean)));
    const docs = await (0, firestore_1.listDocumentsByIds)(docIds);
    const noteMap = new Map(notes.map((note) => [
        note.id,
        {
            title: note.title,
            source_doc_id: note.source_doc_id,
        },
    ]));
    const docMap = new Map(docs.map((doc) => [doc.id, doc]));
    return scored.map(({ chunk, similarity }) => {
        const note = noteMap.get(chunk.note_id);
        const doc = note?.source_doc_id
            ? docMap.get(note.source_doc_id)
            : undefined;
        const sourceTitle = doc?.title ?? note?.title ?? "Note";
        const sourceType = doc ? "document" : "note";
        return {
            id: chunk.id,
            text: chunk.content,
            source_type: sourceType,
            source_title: sourceTitle,
            note_id: chunk.note_id,
            similarity,
        };
    });
}
function cosineSimilarity(a, b) {
    if (!a.length || a.length !== b.length)
        return 0;
    let dot = 0;
    let aMag = 0;
    let bMag = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        aMag += a[i] * a[i];
        bMag += b[i] * b[i];
    }
    if (!aMag || !bMag)
        return 0;
    return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}
