"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDocumentsUploadProcessRoute = registerDocumentsUploadProcessRoute;
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const firestore_1 = require("../../services/firestore");
const storage_1 = require("../../services/storage");
const pdf_1 = require("../../services/pdf");
const llm_1 = require("../../services/llm");
const prompts_1 = require("../../llm/prompts");
function registerDocumentsUploadProcessRoute(router) {
    router.post("/documents-upload-process", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { document_id } = req.body ?? {};
        if (typeof document_id !== "string" || !document_id.trim()) {
            throw new errors_1.BadRequestError("Field 'document_id' is required.");
        }
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const document = await (0, firestore_1.getDocumentById)(document_id);
        if (!document) {
            throw new errors_1.BadRequestError("Document not found.");
        }
        if (document.user_id !== userId) {
            throw new errors_1.UnauthorizedError();
        }
        const fileBuffer = await (0, storage_1.downloadFileBuffer)(document.file_path);
        const extractedText = await (0, pdf_1.extractPdfText)(fileBuffer);
        if (!extractedText) {
            throw new Error("Failed to extract text from PDF.");
        }
        const noteDraft = await (0, llm_1.generateUserJSON)({
            userId,
            systemPrompt: prompts_1.NOTE_PROCESSOR_PROMPT,
            userPrompt: JSON.stringify({ text: extractedText }),
            schemaName: "NoteProcessorResult",
            schema: prompts_1.NOTE_PROCESSOR_SCHEMA,
        });
        res.json({
            document_id: document.id,
            noteDraft,
            stats: {
                bytes: fileBuffer.byteLength,
                characters: extractedText.length,
            },
        });
    }));
}
