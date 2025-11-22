"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveScopeNoteIds = resolveScopeNoteIds;
exports.retrieveContextChunks = retrieveContextChunks;
const firestore_1 = require("./firestore");
const errors_1 = require("../errors");
const pinecone_1 = require("./pinecone");
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
    // If scope is specific notes, we only query for those.
    // Pinecone filter for 'in' array is supported but might hit limits if array is huge.
    // For now, if noteIds is null (all), we don't filter by source_id.
    // If noteIds has 1 item, we filter by source_id.
    // If noteIds has multiple, we might need to filter by 'source_id' using $in operator if supported,
    // or just query all user chunks and filter in memory (less efficient but simple for now if Pinecone free tier limits metadata filters).
    // Actually, Pinecone supports $in.
    let sourceIdFilter = undefined;
    if (noteIds && noteIds.length > 0) {
        if (noteIds.length === 1) {
            sourceIdFilter = { $eq: noteIds[0] };
        }
        else {
            sourceIdFilter = { $in: noteIds };
        }
    }
    else if (noteIds !== null && noteIds.length === 0) {
        // Scope resolved to empty list (e.g. empty folder)
        return [];
    }
    // Query Pinecone
    // Note: Our pinecone service wrapper currently only supports single sourceId or no sourceId.
    // We need to update it or just use it as is.
    // Let's update the usage here to match what I implemented in pinecone.ts or update pinecone.ts.
    // In pinecone.ts I implemented: sourceId?: string.
    // So I can only filter by ONE source ID.
    // If scope is folder (multiple notes), I can't easily filter by folder_id unless I store folder_id in metadata.
    // The design doc said: "source_id: note_id or document_id".
    // So for folder scope, I should probably fetch all user chunks and filter in memory OR update metadata to include folder_id.
    // OR, just query for each note? No, too many queries.
    // OR, update pinecone.ts to accept a filter object.
    // For this iteration, let's assume we only support single note scope or all.
    // If folder scope is used, we might fallback to "all" and filter in memory, or just query all.
    // Let's just query all for user if it's a folder scope for now, and filter results.
    const pineconeResults = await (0, pinecone_1.queryChunks)({
        vector: queryEmbedding,
        topK: matchCount * 2, // Fetch more to allow post-filtering
        userId,
        sourceId: noteIds?.length === 1 ? noteIds[0] : undefined,
        minScore: matchThreshold,
    });
    // Post-filter if we had multiple noteIds (folder scope)
    let results = pineconeResults;
    if (noteIds && noteIds.length > 1) {
        const allowedIds = new Set(noteIds);
        results = results.filter(r => allowedIds.has(r.metadata.source_id));
    }
    results = results.slice(0, matchCount);
    if (!results.length) {
        return [];
    }
    // Hydrate with titles
    const noteIdSet = new Set();
    results.forEach(r => {
        if (r.metadata.source_type === 'note')
            noteIdSet.add(r.metadata.source_id);
    });
    // We might also have documents.
    // For now, let's assume source_id is note_id.
    // If we have documents, we need to handle that.
    // The current system seems to link notes to documents via source_doc_id.
    const notes = await (0, firestore_1.listNotesByIds)(Array.from(noteIdSet));
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
    return results.map((match) => {
        const noteId = match.metadata.source_id;
        const note = noteMap.get(noteId);
        const doc = note?.source_doc_id
            ? docMap.get(note.source_doc_id)
            : undefined;
        const sourceTitle = doc?.title ?? note?.title ?? "Note";
        const sourceType = doc ? "document" : "note";
        return {
            id: match.id,
            text: match.metadata.text || "", // Assume text is in metadata
            source_type: sourceType,
            source_title: sourceTitle,
            note_id: noteId,
            similarity: match.score || 0,
        };
    });
}
