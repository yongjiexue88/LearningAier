import { Router } from "express";
import { authenticateRequest } from "../../middleware/auth";
import { registerAiNotesTranslateRoute } from "./aiNotesTranslate";
import { registerAiNotesTerminologyRoute } from "./aiNotesTerminology";
import { registerAiNotesQaRoute } from "./aiNotesQa";
import { registerDocumentsUploadProcessRoute } from "./documentsUploadProcess";
import { registerNotesReindexRoute } from "./notesReindex";
import { registerFlashcardsReviewRoute } from "./flashcardsReview";
import { registerAiFlashcardsGenerateRoute } from "./aiFlashcardsGenerate";
import { registerFlashcardsSaveSelectedRoute } from "./flashcardsSaveSelected";

export function createFunctionsRouter(): Router {
  const router = Router();
  router.use(authenticateRequest);

  registerAiNotesTranslateRoute(router);
  registerAiNotesTerminologyRoute(router);
  registerAiNotesQaRoute(router);
  registerDocumentsUploadProcessRoute(router);
  registerNotesReindexRoute(router);
  registerFlashcardsReviewRoute(router);
  registerAiFlashcardsGenerateRoute(router);
  registerFlashcardsSaveSelectedRoute(router);

  return router;
}
