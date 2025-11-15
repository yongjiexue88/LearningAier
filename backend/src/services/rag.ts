import {
  getNoteById,
  listDocumentsByIds,
  listNoteChunksByNoteIds,
  listNotesByFolder,
  listNotesByIds,
  listUserNoteChunks,
  type NoteChunkRecord,
} from "./firestore";
import { BadRequestError } from "../errors";

export type QAScope =
  | { type: "all" }
  | { type: "note"; id: string }
  | { type: "folder"; id: string };

export interface ContextChunk {
  id: string;
  text: string;
  source_type: "note" | "document";
  source_title: string;
  note_id: string;
  similarity: number;
}

export async function resolveScopeNoteIds(
  userId: string,
  scope: QAScope
): Promise<string[] | null> {
  if (scope.type === "all") {
    return null;
  }

  if (!scope.id) {
    throw new BadRequestError("Scope id is required");
  }

  if (scope.type === "note") {
    const note = await getNoteById(scope.id);
    if (!note || note.user_id !== userId) {
      throw new BadRequestError("Note not found or unauthorized");
    }
    return [note.id];
  }

  // Folder scope
  const notes = await listNotesByFolder(userId, scope.id);
  return notes.map((note) => note.id);
}

export interface RetrievalParams {
  userId: string;
  scope: QAScope;
  queryEmbedding: number[];
  matchCount?: number;
  matchThreshold?: number;
}

export async function retrieveContextChunks({
  userId,
  scope,
  queryEmbedding,
  matchCount = 8,
  matchThreshold = 0.4,
}: RetrievalParams): Promise<ContextChunk[]> {
  const noteIds = await resolveScopeNoteIds(userId, scope);
  let chunks: NoteChunkRecord[] = [];

  if (noteIds === null) {
    chunks = await listUserNoteChunks(userId);
  } else if (noteIds.length > 0) {
    chunks = await listNoteChunksByNoteIds(noteIds);
  } else {
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

  const noteIdSet = Array.from(
    new Set(scored.map(({ chunk }) => chunk.note_id))
  );
  const notes = await listNotesByIds(noteIdSet);
  const docIds = Array.from(
    new Set(notes.map((note) => note.source_doc_id).filter(Boolean))
  ) as string[];
  const docs = await listDocumentsByIds(docIds);

  const noteMap = new Map(
    notes.map((note) => [
      note.id,
      {
        title: note.title,
        source_doc_id: note.source_doc_id,
      },
    ])
  );
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

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  if (!aMag || !bMag) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}
