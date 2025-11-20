"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFunctionsRouter = createFunctionsRouter;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const aiNotesTranslate_1 = require("./aiNotesTranslate");
const aiNotesTerminology_1 = require("./aiNotesTerminology");
const aiNotesQa_1 = require("./aiNotesQa");
const documentsUploadProcess_1 = require("./documentsUploadProcess");
const notesReindex_1 = require("./notesReindex");
const flashcardsReview_1 = require("./flashcardsReview");
const aiFlashcardsGenerate_1 = require("./aiFlashcardsGenerate");
const flashcardsSaveSelected_1 = require("./flashcardsSaveSelected");
function createFunctionsRouter() {
    const router = (0, express_1.Router)();
    router.use(auth_1.authenticateRequest);
    (0, aiNotesTranslate_1.registerAiNotesTranslateRoute)(router);
    (0, aiNotesTerminology_1.registerAiNotesTerminologyRoute)(router);
    (0, aiNotesQa_1.registerAiNotesQaRoute)(router);
    (0, documentsUploadProcess_1.registerDocumentsUploadProcessRoute)(router);
    (0, notesReindex_1.registerNotesReindexRoute)(router);
    (0, flashcardsReview_1.registerFlashcardsReviewRoute)(router);
    (0, aiFlashcardsGenerate_1.registerAiFlashcardsGenerateRoute)(router);
    (0, flashcardsSaveSelected_1.registerFlashcardsSaveSelectedRoute)(router);
    return router;
}
