import type {
  CollectionReference,
  DocumentData,
  Query,
  WriteBatch,
} from "firebase-admin/firestore";
import { firestore } from "./firebaseAdmin";

export const db = firestore;

export type FirestoreCollection<T extends DocumentData> = CollectionReference<T>;

function col<T extends DocumentData>(name: string): CollectionReference<T> {
  return db.collection(name) as CollectionReference<T>;
}

export interface ProfileData {
  display_name?: string | null;
  llm_provider?: string | null;
  llm_model?: string | null;
}
export type ProfileRecord = ProfileData & { id: string };

export interface DocumentDataRecord {
  user_id: string;
  folder_id: string;
  title: string;
  file_path: string;
  created_at?: string;
  updated_at?: string;
}
export type DocumentRecord = DocumentDataRecord & { id: string };

export interface NoteData {
  user_id: string;
  folder_id: string;
  title: string;
  content_md_zh?: string | null;
  content_md_en?: string | null;
  primary_language?: "zh" | "en" | "generic" | null;
  source_doc_id?: string | null;
  sort_order?: number;
  word_count?: number;
  reading_time_seconds?: number;
  auto_save_version?: number;
  auto_saved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
export type NoteRecord = NoteData & { id: string };

export interface NoteChunkData {
  note_id: string;
  user_id: string;
  content: string;
  embedding?: number[]; // Deprecated: Moved to Vector DB
  position: number;
  created_at?: string;
}
export type NoteChunkRecord = NoteChunkData & { id: string };

export interface FlashcardData {
  user_id: string;
  note_id?: string | null;
  document_id?: string | null;
  set_id?: string | null;
  term_zh?: string | null;
  term_en?: string | null;
  definition_zh: string;
  definition_en: string;
  context_zh?: string | null;
  context_en?: string | null;
  category: "vocabulary" | "concept" | "code" | "definition";
  next_due_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
export type FlashcardRecord = FlashcardData & { id: string };

export interface FlashcardReviewData {
  flashcard_id: string;
  user_id: string;
  response: "again" | "hard" | "good" | "easy";
  reviewed_at: string;
  next_due_at: string;
  interval_days: number;
}
export type FlashcardReviewRecord = FlashcardReviewData & { id: string };

export interface FlashcardGenerationLogData {
  user_id: string;
  note_id: string;
  status: "success" | "preview" | "empty" | "error";
  message: string;
  candidate_count: number;
  generated_count: number;
  saved_count: number;
  set_id?: string | null;
  model?: string | null;
  created_at?: string;
}
export type FlashcardGenerationLogRecord = FlashcardGenerationLogData & { id: string };

export interface FlashcardSetData {
  user_id: string;
  note_id?: string | null;
  name?: string | null;
  source?: "note" | "manual";
  model?: string | null;
  provider?: string | null;
  flashcard_ids: string[];
  created_at?: string;
  updated_at?: string;
}
export type FlashcardSetRecord = FlashcardSetData & { id: string };

export function nowIso(): string {
  return new Date().toISOString();
}

function snapshotToRecord<T extends DocumentData>(
  snap: FirebaseFirestore.DocumentSnapshot<T>
): (T & { id: string }) | null {
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

export async function getProfileById(
  userId: string
): Promise<ProfileRecord | null> {
  const snap = await col<ProfileData>("profiles").doc(userId).get();
  return snapshotToRecord<ProfileData>(snap);
}

export async function getNoteById(noteId: string): Promise<NoteRecord | null> {
  const snap = await col<NoteData>("notes").doc(noteId).get();
  return snapshotToRecord<NoteData>(snap);
}

export async function getDocumentById(
  documentId: string
): Promise<DocumentRecord | null> {
  const snap = await col<DocumentDataRecord>("documents")
    .doc(documentId)
    .get();
  return snapshotToRecord<DocumentDataRecord>(snap);
}

export async function getFlashcardById(
  flashcardId: string
): Promise<FlashcardRecord | null> {
  const snap = await col<FlashcardData>("flashcards").doc(flashcardId).get();
  return snapshotToRecord<FlashcardData>(snap);
}

export async function getLatestFlashcardReview(
  flashcardId: string
): Promise<FlashcardReviewRecord | null> {
  const snapshot = await col<FlashcardReviewData>("flashcard_reviews")
    .where("flashcard_id", "==", flashcardId)
    .orderBy("reviewed_at", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as FlashcardReviewData) };
}

export async function listNoteChunksByNoteIds(
  noteIds: string[]
): Promise<NoteChunkRecord[]> {
  if (!noteIds.length) return [];
  const chunks: NoteChunkRecord[] = [];
  const batchSize = 10;

  for (let i = 0; i < noteIds.length; i += batchSize) {
    const slice = noteIds.slice(i, i + batchSize);
    const snapshot = await col<NoteChunkData>("note_chunks")
      .where("note_id", "in", slice)
      .get();
    snapshot.forEach((doc) => {
      chunks.push({ id: doc.id, ...(doc.data() as NoteChunkData) });
    });
  }

  return chunks;
}

export async function listUserNoteChunks(
  userId: string
): Promise<NoteChunkRecord[]> {
  const snapshot = await col<NoteChunkData>("note_chunks")
    .where("user_id", "==", userId)
    .get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as NoteChunkData),
  }));
}

export async function listNotesByFolder(
  userId: string,
  folderId: string
): Promise<NoteRecord[]> {
  const snapshot = await col<NoteData>("notes")
    .where("user_id", "==", userId)
    .where("folder_id", "==", folderId)
    .get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as NoteData),
  }));
}

export async function listNotesByIds(ids: string[]): Promise<NoteRecord[]> {
  if (!ids.length) return [];
  const notes: NoteRecord[] = [];
  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const slice = ids.slice(i, i + batchSize);
    const snapshot = await col<NoteData>("notes")
      .where("__name__", "in", slice)
      .get();
    snapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...(doc.data() as NoteData) });
    });
  }
  return notes;
}

export async function listDocumentsByIds(
  ids: string[]
): Promise<DocumentRecord[]> {
  if (!ids.length) return [];
  const docs: DocumentRecord[] = [];
  const batchSize = 10;
  for (let i = 0; i < ids.length; i += batchSize) {
    const slice = ids.slice(i, i + batchSize);
    const snapshot = await col<DocumentDataRecord>("documents")
      .where("__name__", "in", slice)
      .get();
    snapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...(doc.data() as DocumentDataRecord) });
    });
  }
  return docs;
}

export async function runUserQuery<T extends DocumentData>(
  collection: string,
  userId: string,
  builder?: (query: Query<T>) => Query<T>
): Promise<(T & { id: string })[]> {
  let query = db
    .collection(collection)
    .where("user_id", "==", userId) as Query<T>;
  if (builder) {
    query = builder(query);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as T) }));
}

async function commitInBatches<T>(
  items: T[],
  writer: (batch: WriteBatch, item: T) => void,
  chunkSize = 400
): Promise<void> {
  if (!items.length) return;
  for (let i = 0; i < items.length; i += chunkSize) {
    const slice = items.slice(i, i + chunkSize);
    const batch = db.batch();
    slice.forEach((item) => writer(batch, item));
    await batch.commit();
  }
}

export async function replaceNoteChunks(
  noteId: string,
  userId: string,
  records: Array<{ content: string; embedding: number[]; position: number }>
): Promise<void> {
  const collection = col<NoteChunkData>("note_chunks");
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
    } satisfies NoteChunkData);
  });
}

export async function createFlashcards(
  records: Array<Omit<FlashcardData, "created_at" | "updated_at">>
): Promise<FlashcardRecord[]> {
  if (!records.length) return [];
  const collection = col<FlashcardData>("flashcards");
  const now = nowIso();
  const created: FlashcardRecord[] = [];

  await commitInBatches(records, (batch, record) => {
    const ref = collection.doc();
    const payload: FlashcardData = {
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

export async function createFlashcardReview(
  record: FlashcardReviewData
): Promise<FlashcardReviewRecord> {
  const collection = col<FlashcardReviewData>("flashcard_reviews");
  const ref = collection.doc();
  await ref.set(record);
  return { id: ref.id, ...record };
}

export async function updateFlashcard(
  flashcardId: string,
  data: Partial<FlashcardData>
): Promise<void> {
  await col<FlashcardData>("flashcards")
    .doc(flashcardId)
    .update({ ...data, updated_at: nowIso() });
}

export async function createFlashcardGenerationLog(
  data: FlashcardGenerationLogData
): Promise<FlashcardGenerationLogRecord> {
  const collection = col<FlashcardGenerationLogData>("flashcard_generation_logs");
  const ref = collection.doc();
  const payload: FlashcardGenerationLogData = {
    ...data,
    created_at: data.created_at ?? nowIso(),
  };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

export async function createFlashcardSet(
  data: FlashcardSetData
): Promise<FlashcardSetRecord> {
  const collection = col<FlashcardSetData>("flashcard_sets");
  const ref = collection.doc();
  const payload: FlashcardSetData = {
    ...data,
    flashcard_ids: data.flashcard_ids ?? [],
    created_at: data.created_at ?? nowIso(),
    updated_at: data.updated_at ?? nowIso(),
  };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

export async function updateFlashcardSet(
  setId: string,
  data: Partial<FlashcardSetData>
): Promise<void> {
  await col<FlashcardSetData>("flashcard_sets")
    .doc(setId)
    .update({ ...data, updated_at: nowIso() });
}
