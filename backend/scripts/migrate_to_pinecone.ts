import * as dotenv from "dotenv";
import path from "path";

// Load env vars from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { firestore } from "../src/services/firebaseAdmin";
import { embedTexts } from "../src/services/embeddings";
import { upsertChunks, VectorRecord } from "../src/services/pinecone";
import { NoteChunkData } from "../src/services/firestore";

async function migrate() {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: PINECONE_API_KEY is not set in .env or .env.local");
        console.error("Please set this variable to run the migration.");
        process.exit(1);
    }

    console.log("Starting migration to Pinecone...");

    const chunksRef = firestore.collection("note_chunks");
    const snapshot = await chunksRef.get();

    if (snapshot.empty) {
        console.log("No chunks found in Firestore.");
        return;
    }

    console.log(`Found ${snapshot.size} chunks to process.`);

    const batchSize = 50;
    let processed = 0;
    let errors = 0;

    // Process in batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
        const batchDocs = docs.slice(i, i + batchSize);
        const recordsToUpsert: VectorRecord[] = [];

        // Prepare batch for embedding generation if needed
        // Note: If chunks already have embeddings in Firestore, we can reuse them.
        // But the type definition says embedding is optional now.
        // If it's missing, we generate it.

        const textsToEmbed: string[] = [];
        const docsToEmbed: any[] = [];

        for (const doc of batchDocs) {
            const data = doc.data() as NoteChunkData;

            // If we have an embedding, use it.
            if (data.embedding && data.embedding.length > 0) {
                recordsToUpsert.push({
                    id: doc.id,
                    values: data.embedding,
                    metadata: {
                        user_id: data.user_id,
                        source_id: data.note_id, // Assuming note_id is always present for now
                        source_type: "note", // Default to note, logic might need adjustment if documents are mixed
                        chunk_index: data.position,
                        text: data.content,
                    },
                });
            } else {
                // Need to generate embedding
                textsToEmbed.push(data.content);
                docsToEmbed.push({ doc, data });
            }
        }

        // Generate missing embeddings
        if (textsToEmbed.length > 0) {
            try {
                console.log(`Generating embeddings for ${textsToEmbed.length} chunks...`);
                const embeddings = await embedTexts(textsToEmbed);

                embeddings.forEach((embedding, index) => {
                    const { doc, data } = docsToEmbed[index];
                    recordsToUpsert.push({
                        id: doc.id,
                        values: embedding,
                        metadata: {
                            user_id: data.user_id,
                            source_id: data.note_id,
                            source_type: "note",
                            chunk_index: data.position,
                            text: data.content,
                        },
                    });
                });
            } catch (err) {
                console.error("Error generating embeddings:", err);
                errors += textsToEmbed.length;
            }
        }

        // Upsert to Pinecone
        if (recordsToUpsert.length > 0) {
            try {
                await upsertChunks(recordsToUpsert);
                processed += recordsToUpsert.length;
                console.log(`Upserted ${processed}/${snapshot.size} chunks.`);
            } catch (err) {
                console.error("Error upserting to Pinecone:", err);
                errors += recordsToUpsert.length;
            }
        }
    }

    console.log(`Migration complete. Processed: ${processed}, Errors: ${errors}`);
}

migrate().catch(console.error);
