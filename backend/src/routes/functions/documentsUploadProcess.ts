import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError, UnauthorizedError } from "../../errors";
import { getDocumentById } from "../../services/firestore";
import { downloadFileBuffer } from "../../services/storage";
import { extractPdfText } from "../../services/pdf";
import { generateUserJSON } from "../../services/llm";
import {
  NOTE_PROCESSOR_PROMPT,
  NOTE_PROCESSOR_SCHEMA,
} from "../../llm/prompts";

export function registerDocumentsUploadProcessRoute(router: Router): void {
  router.post(
    "/documents-upload-process",
    asyncHandler(async (req, res) => {
      const { document_id } = req.body ?? {};
      if (typeof document_id !== "string" || !document_id.trim()) {
        throw new BadRequestError("Field 'document_id' is required.");
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const document = await getDocumentById(document_id);
      if (!document) {
        throw new BadRequestError("Document not found.");
      }
      if (document.user_id !== userId) {
        throw new UnauthorizedError();
      }

      const fileBuffer = await downloadFileBuffer(document.file_path);
      const extractedText = await extractPdfText(fileBuffer);
      if (!extractedText) {
        throw new Error("Failed to extract text from PDF.");
      }

      const noteDraft = await generateUserJSON({
        userId,
        systemPrompt: NOTE_PROCESSOR_PROMPT,
        userPrompt: JSON.stringify({ text: extractedText }),
        schemaName: "NoteProcessorResult",
        schema: NOTE_PROCESSOR_SCHEMA,
      });

      res.json({
        document_id: document.id,
        noteDraft,
        stats: {
          bytes: fileBuffer.byteLength,
          characters: extractedText.length,
        },
      });
    })
  );
}
