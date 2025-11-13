import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";
import {
  readJson,
  jsonResponse,
  handleError,
  UnauthorizedError,
  BadRequestError,
} from "../_shared/responses.ts";
import { embedTexts } from "../_shared/embeddings.ts";
import { chunkBilingualMarkdown } from "../../src/embeddings/chunking.ts";
import { getRuntimeConfig } from "../_shared/env.ts";

interface Payload {
  note_id: string;
}

serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    }

    const payload = await readJson<Payload>(req);
    if (!payload.note_id) {
      throw new BadRequestError("Field 'note_id' is required.");
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError();
    }

    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, user_id, content_md_zh, content_md_en")
      .eq("id", payload.note_id)
      .maybeSingle();

    if (noteError || !note) {
      throw new BadRequestError("Note not found.");
    }
    if (note.user_id !== user.id) {
      throw new UnauthorizedError();
    }

    const chunks = chunkBilingualMarkdown({
      zh: note.content_md_zh ?? "",
      en: note.content_md_en ?? "",
    });

    if (!chunks.length) {
      throw new BadRequestError("Note has no content to index.");
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
    if (embeddings.length !== chunks.length) {
      throw new Error("Embeddings count mismatch.");
    }

    await supabase.from("note_chunks").delete().eq("note_id", note.id);

    const upsertPayload = chunks.map((chunk, idx) => ({
      note_id: note.id,
      content: chunk.text,
      embedding: embeddings[idx],
      position: chunk.position,
    }));

    const { error: insertError } = await supabase
      .from("note_chunks")
      .insert(upsertPayload);

    if (insertError) {
      throw new Error(`Failed to store embeddings: ${insertError.message}`);
    }

    const runtime = getRuntimeConfig();
    return jsonResponse({
      note_id: note.id,
      chunks_processed: upsertPayload.length,
      embedding_model: runtime.embeddingsModel,
    });
  } catch (error) {
    return handleError(error);
  }
});
