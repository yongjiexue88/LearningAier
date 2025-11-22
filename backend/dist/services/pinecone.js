"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertChunks = upsertChunks;
exports.queryChunks = queryChunks;
exports.deleteChunks = deleteChunks;
exports.deleteChunksBySource = deleteChunksBySource;
const pinecone_1 = require("@pinecone-database/pinecone");
// Initialize Pinecone client
const pinecone = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY || "",
});
const INDEX_NAME = "learningaier-index";
/**
 * Get the Pinecone index instance
 */
function getIndex() {
    return pinecone.index(INDEX_NAME);
}
/**
 * Upsert chunks to Pinecone
 */
async function upsertChunks(records) {
    if (!records.length)
        return;
    const index = getIndex();
    // Pinecone recommends batching upserts (e.g., 100 at a time)
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await index.upsert(batch);
    }
}
/**
 * Query chunks from Pinecone
 */
async function queryChunks({ vector, topK, userId, sourceId, minScore = 0.0, }) {
    const index = getIndex();
    const filter = {
        user_id: { $eq: userId },
    };
    if (sourceId) {
        filter.source_id = { $eq: sourceId };
    }
    const results = await index.query({
        vector,
        topK,
        filter,
        includeMetadata: true,
    });
    return results.matches
        .filter((match) => (match.score ?? 0) >= minScore)
        .map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
    }));
}
/**
 * Delete chunks by ID
 */
async function deleteChunks(ids) {
    if (!ids.length)
        return;
    const index = getIndex();
    await index.deleteMany(ids);
}
/**
 * Delete chunks by metadata filter (e.g., delete all chunks for a note)
 * Note: Delete by metadata is supported in serverless indexes.
 */
async function deleteChunksBySource(userId, sourceId) {
    const index = getIndex();
    await index.deleteMany({
        user_id: { $eq: userId },
        source_id: { $eq: sourceId },
    });
}
