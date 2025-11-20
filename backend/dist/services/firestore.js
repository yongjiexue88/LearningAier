"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.nowIso = nowIso;
exports.getProfileById = getProfileById;
exports.getNoteById = getNoteById;
exports.getDocumentById = getDocumentById;
exports.getFlashcardById = getFlashcardById;
exports.getLatestFlashcardReview = getLatestFlashcardReview;
exports.listNoteChunksByNoteIds = listNoteChunksByNoteIds;
exports.listUserNoteChunks = listUserNoteChunks;
exports.listNotesByFolder = listNotesByFolder;
exports.listNotesByIds = listNotesByIds;
exports.listDocumentsByIds = listDocumentsByIds;
exports.runUserQuery = runUserQuery;
exports.replaceNoteChunks = replaceNoteChunks;
exports.createFlashcards = createFlashcards;
exports.createFlashcardReview = createFlashcardReview;
exports.updateFlashcard = updateFlashcard;
exports.createFlashcardGenerationLog = createFlashcardGenerationLog;
exports.createFlashcardSet = createFlashcardSet;
exports.updateFlashcardSet = updateFlashcardSet;
const firebaseAdmin_1 = require("./firebaseAdmin");
exports.db = firebaseAdmin_1.firestore;
function col(name) {
    return exports.db.collection(name);
}
function nowIso() {
    return new Date().toISOString();
}
function snapshotToRecord(snap) {
    if (!snap.exists)
        return null;
    return { id: snap.id, ...snap.data() };
}
async function getProfileById(userId) {
    const snap = await col("profiles").doc(userId).get();
    return snapshotToRecord(snap);
}
async function getNoteById(noteId) {
    const snap = await col("notes").doc(noteId).get();
    return snapshotToRecord(snap);
}
async function getDocumentById(documentId) {
    const snap = await col("documents")
        .doc(documentId)
        .get();
    return snapshotToRecord(snap);
}
async function getFlashcardById(flashcardId) {
    const snap = await col("flashcards").doc(flashcardId).get();
    return snapshotToRecord(snap);
}
async function getLatestFlashcardReview(flashcardId) {
    const snapshot = await col("flashcard_reviews")
        .where("flashcard_id", "==", flashcardId)
        .orderBy("reviewed_at", "desc")
        .limit(1)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}
async function listNoteChunksByNoteIds(noteIds) {
    if (!noteIds.length)
        return [];
    const chunks = [];
    const batchSize = 10;
    for (let i = 0; i < noteIds.length; i += batchSize) {
        const slice = noteIds.slice(i, i + batchSize);
        const snapshot = await col("note_chunks")
            .where("note_id", "in", slice)
            .get();
        snapshot.forEach((doc) => {
            chunks.push({ id: doc.id, ...doc.data() });
        });
    }
    return chunks;
}
async function listUserNoteChunks(userId) {
    const snapshot = await col("note_chunks")
        .where("user_id", "==", userId)
        .get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}
async function listNotesByFolder(userId, folderId) {
    const snapshot = await col("notes")
        .where("user_id", "==", userId)
        .where("folder_id", "==", folderId)
        .get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}
async function listNotesByIds(ids) {
    if (!ids.length)
        return [];
    const notes = [];
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
        const slice = ids.slice(i, i + batchSize);
        const snapshot = await col("notes")
            .where("__name__", "in", slice)
            .get();
        snapshot.forEach((doc) => {
            notes.push({ id: doc.id, ...doc.data() });
        });
    }
    return notes;
}
async function listDocumentsByIds(ids) {
    if (!ids.length)
        return [];
    const docs = [];
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
        const slice = ids.slice(i, i + batchSize);
        const snapshot = await col("documents")
            .where("__name__", "in", slice)
            .get();
        snapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
        });
    }
    return docs;
}
async function runUserQuery(collection, userId, builder) {
    let query = exports.db
        .collection(collection)
        .where("user_id", "==", userId);
    if (builder) {
        query = builder(query);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
async function commitInBatches(items, writer, chunkSize = 400) {
    if (!items.length)
        return;
    for (let i = 0; i < items.length; i += chunkSize) {
        const slice = items.slice(i, i + chunkSize);
        const batch = exports.db.batch();
        slice.forEach((item) => writer(batch, item));
        await batch.commit();
    }
}
async function replaceNoteChunks(noteId, userId, records) {
    const collection = col("note_chunks");
    const existing = await collection.where("note_id", "==", noteId).get();
    if (!existing.empty) {
        await commitInBatches(existing.docs, (batch, doc) => batch.delete(doc.ref));
    }
    if (!records.length) {
        return;
    }
    await commitInBatches(records, (batch, record) => {
        const ref = collection.doc();
        batch.set(ref, {
            note_id: noteId,
            user_id: userId,
            content: record.content,
            embedding: record.embedding,
            position: record.position,
            created_at: nowIso(),
        });
    });
}
async function createFlashcards(records) {
    if (!records.length)
        return [];
    const collection = col("flashcards");
    const now = nowIso();
    const created = [];
    await commitInBatches(records, (batch, record) => {
        const ref = collection.doc();
        const payload = {
            ...record,
            set_id: record.set_id ?? null,
            next_due_at: record.next_due_at ?? null,
            created_at: now,
            updated_at: now,
        };
        batch.set(ref, payload);
        created.push({ id: ref.id, ...payload });
    });
    return created;
}
async function createFlashcardReview(record) {
    const collection = col("flashcard_reviews");
    const ref = collection.doc();
    await ref.set(record);
    return { id: ref.id, ...record };
}
async function updateFlashcard(flashcardId, data) {
    await col("flashcards")
        .doc(flashcardId)
        .update({ ...data, updated_at: nowIso() });
}
async function createFlashcardGenerationLog(data) {
    const collection = col("flashcard_generation_logs");
    const ref = collection.doc();
    const payload = {
        ...data,
        created_at: data.created_at ?? nowIso(),
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
}
async function createFlashcardSet(data) {
    const collection = col("flashcard_sets");
    const ref = collection.doc();
    const payload = {
        ...data,
        flashcard_ids: data.flashcard_ids ?? [],
        created_at: data.created_at ?? nowIso(),
        updated_at: data.updated_at ?? nowIso(),
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
}
async function updateFlashcardSet(setId, data) {
    await col("flashcard_sets")
        .doc(setId)
        .update({ ...data, updated_at: nowIso() });
}
