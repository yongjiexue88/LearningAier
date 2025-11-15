import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError } from "../../errors";
import { generateUserJSON } from "../../services/llm";
import {
  NOTE_PROCESSOR_PROMPT,
  NOTE_PROCESSOR_SCHEMA,
} from "../../llm/prompts";

export function registerAiNotesProcessRoute(router: Router): void {
  router.post(
    "/ai-notes-process",
    asyncHandler(async (req, res) => {
      const { text } = req.body ?? {};
      if (typeof text !== "string" || !text.trim()) {
        throw new BadRequestError("Field 'text' is required.");
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const result = await generateUserJSON({
        userId,
        systemPrompt: NOTE_PROCESSOR_PROMPT,
        userPrompt: JSON.stringify({ text }),
        schemaName: "NoteProcessorResult",
        schema: NOTE_PROCESSOR_SCHEMA,
      });

      res.json(result);
    })
  );
}
