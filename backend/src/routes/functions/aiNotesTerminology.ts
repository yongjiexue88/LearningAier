import type { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { BadRequestError } from "../../errors";
import { generateUserJSON } from "../../services/llm";
import {
  TERMINOLOGY_PROMPT,
  TERMINOLOGY_SCHEMA,
} from "../../llm/prompts";

export function registerAiNotesTerminologyRoute(router: Router): void {
  router.post(
    "/ai-notes-terminology",
    asyncHandler(async (req, res) => {
      const { text, maxTerms } = req.body ?? {};
      if (typeof text !== "string" || !text.trim()) {
        throw new BadRequestError("Field 'text' is required.");
      }

      const userId = (req as AuthenticatedRequest).user?.uid;
      if (!userId) {
        throw new BadRequestError("User context missing from request.");
      }

      const result = await generateUserJSON({
        userId,
        systemPrompt: TERMINOLOGY_PROMPT,
        userPrompt: JSON.stringify({
          text,
          limit: typeof maxTerms === "number" ? maxTerms : 15,
        }),
        schemaName: "TerminologyResult",
        schema: TERMINOLOGY_SCHEMA,
      });

      res.json(result);
    })
  );
}
