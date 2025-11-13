import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  supabase: SupabaseClient,
  userId: string,
  scope: QAScope
): Promise<string[] | null> {
  if (scope.type === "all") {
    return null;
  }

  if (!scope.id) {
    throw new Error("Scope id is required");
  }

  if (scope.type === "note") {
    const { data, error } = await supabase
      .from("notes")
      .select("id")
      .eq("id", scope.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new Error("Note not found or unauthorized");
    }
    return [data.id];
  }

  // Folder scope
  const { data, error } = await supabase
    .from("notes")
    .select("id")
    .eq("folder_id", scope.id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load notes for folder: ${error.message}`);
  }

  return data?.map((row) => row.id) ?? [];
}

export interface RetrievalParams {
  supabase: SupabaseClient;
  userId: string;
  scope: QAScope;
  queryEmbedding: number[];
  matchCount?: number;
  matchThreshold?: number;
}

export async function retrieveContextChunks({
  supabase,
  userId,
  scope,
  queryEmbedding,
  matchCount = 8,
  matchThreshold = 0.4,
}: RetrievalParams): Promise<ContextChunk[]> {
  const noteIds = await resolveScopeNoteIds(supabase, userId, scope);

  const { data, error } = await supabase.rpc("match_note_chunks", {
    p_user_id: userId,
    p_query_embedding: queryEmbedding,
    p_match_count: matchCount,
    p_match_threshold: matchThreshold,
    p_note_ids: noteIds && noteIds.length > 0 ? noteIds : null,
  });

  if (error) {
    throw new Error(`Failed to retrieve note chunks: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const noteIdSet = Array.from(new Set(data.map((row: { note_id: string }) => row.note_id)));
  const { data: noteRows, error: notesError } = await supabase
    .from("notes")
    .select("id,title,source_doc_id,documents:documents(id,title)")
    .in("id", noteIdSet);

  if (notesError) {
    throw new Error(`Failed to load note metadata: ${notesError.message}`);
  }

  const noteMap = new Map(
    (noteRows ?? []).map((note) => [
      note.id,
      {
        title: note.title,
        source_doc_id: note.source_doc_id,
        document_title: note.documents?.title,
      },
    ])
  );

  return data.map((row: any) => {
    const meta = noteMap.get(row.note_id);
    const sourceTitle = meta?.document_title ?? meta?.title ?? "Note";
    const sourceType = meta?.document_title ? "document" : "note";
    return {
      id: row.chunk_id,
      text: row.content,
      source_type: sourceType,
      source_title: sourceTitle,
      note_id: row.note_id,
      similarity: row.similarity,
    } as ContextChunk;
  });
}
