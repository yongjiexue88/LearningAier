import { Router } from "express";
import { authenticateRequest } from "../../middleware/auth";
import { registerAiNotesProcessRoute } from "./aiNotesProcess";
import { registerAiNotesTranslateRoute } from "./aiNotesTranslate";
import { registerAiNotesTerminologyRoute } from "./aiNotesTerminology";
import { registerAiNotesQaRoute } from "./aiNotesQa";
import { registerDocumentsUploadProcessRoute } from "./documentsUploadProcess";
import { registerNotesReindexRoute } from "./notesReindex";
import { registerFlashcardsReviewRoute } from "./flashcardsReview";
import { registerAiFlashcardsGenerateRoute } from "./aiFlashcardsGenerate";

export function createFunctionsRouter(): Router {
  const router = Router();
  router.use(authenticateRequest);

  registerAiNotesProcessRoute(router);
  registerAiNotesTranslateRoute(router);
  registerAiNotesTerminologyRoute(router);
  registerAiNotesQaRoute(router);
  registerDocumentsUploadProcessRoute(router);
  registerNotesReindexRoute(router);
  registerFlashcardsReviewRoute(router);
  registerAiFlashcardsGenerateRoute(router);

  return router;
}
