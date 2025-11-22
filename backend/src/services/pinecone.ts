import { Pinecone } from "@pinecone-database/pinecone";
import { runtimeConfig } from "../config/runtime";

// Initialize Pinecone client lazily
let pinecone: Pinecone | null = null;

function getClient(): Pinecone {
    if (!pinecone) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) {
            throw new Error("PINECONE_API_KEY is not set");
        }
        pinecone = new Pinecone({ apiKey });
    }
    return pinecone;
}

const INDEX_NAME = "learningaier-index";

export interface VectorMetadata {
    user_id: string;
    source_id: string;
    source_type: "note" | "document";
    chunk_index: number;
    text?: string; // Optional: store text in metadata for faster retrieval
    [key: string]: any;
}

export interface VectorRecord {
    id: string;
    values: number[];
    metadata: VectorMetadata;
}

/**
 * Get the Pinecone index instance
 */
function getIndex() {
    return getClient().index(INDEX_NAME);
}

/**
 * Upsert chunks to Pinecone
 */
export async function upsertChunks(records: VectorRecord[]): Promise<void> {
    if (!records.length) return;
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
export async function queryChunks({
    vector,
    topK,
    userId,
    sourceId,
    minScore = 0.0,
}: {
    vector: number[];
    topK: number;
    userId: string;
    sourceId?: string;
    minScore?: number;
}) {
    const index = getIndex();

    const filter: any = {
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
            metadata: match.metadata as unknown as VectorMetadata,
        }));
}

/**
 * Delete chunks by ID
 */
export async function deleteChunks(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const index = getIndex();
    await index.deleteMany(ids);
}

/**
 * Delete chunks by metadata filter (e.g., delete all chunks for a note)
 * Note: Delete by metadata is supported in serverless indexes.
 */
export async function deleteChunksBySource(
    userId: string,
    sourceId: string
): Promise<void> {
    const index = getIndex();
    await index.deleteMany({
        user_id: { $eq: userId },
        source_id: { $eq: sourceId },
    });
}
