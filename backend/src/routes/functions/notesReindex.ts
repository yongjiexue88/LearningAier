import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../../errors";
import { getNoteById, replaceNoteChunks } from "../../services/firestore";
import { chunkMarkdown } from "../../embeddings/chunking";
import { embedTexts } from "../../services/embeddings";
import { runtimeConfig } from "../../config/runtime";

export function registerNotesReindexRoute(router: Router): void {
  router.post(
    "/notes-reindex",
    asyncHandler(async (req, res) => {
      const { note_id } = req.body ?? {};
      if (typeof note_id !== "string" || !note_id.trim()) {
        throw new BadRequestError("Field 'note_id' is required.");
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const note = await getNoteById(note_id);
      if (!note) {
        throw new BadRequestError("Note not found.");
      }
      if (note.user_id !== userId) {
        throw new UnauthorizedError();
      }

      const content = note.content_md_en ?? note.content_md_zh ?? "";
      const chunks = chunkMarkdown(content);

      if (!chunks.length) {
        throw new BadRequestError("Note has no content to index.");
      }

      const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
      if (embeddings.length !== chunks.length) {
        throw new Error("Embeddings count mismatch.");
      }

      await replaceNoteChunks(
        note.id,
        userId,
        chunks.map((chunk, idx) => ({
          content: chunk.text,
          embedding: embeddings[idx],
          position: chunk.position,
        }))
      );

      res.json({
        note_id: note.id,
        chunks_processed: chunks.length,
        embedding_model: runtimeConfig.embeddingsModel,
      });
    })
  );
}
