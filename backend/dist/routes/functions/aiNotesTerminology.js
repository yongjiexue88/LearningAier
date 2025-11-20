"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAiNotesTerminologyRoute = registerAiNotesTerminologyRoute;
const asyncHandler_1 = require("../../middleware/asyncHandler");
const errors_1 = require("../../errors");
const llm_1 = require("../../services/llm");
const prompts_1 = require("../../llm/prompts");
function registerAiNotesTerminologyRoute(router) {
    router.post("/ai-notes-terminology", (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { text, maxTerms } = req.body ?? {};
        if (typeof text !== "string" || !text.trim()) {
            throw new errors_1.BadRequestError("Field 'text' is required.");
        }
        const userId = req.user?.uid;
        if (!userId) {
            throw new errors_1.BadRequestError("User context missing from request.");
        }
        const result = await (0, llm_1.generateUserJSON)({
            userId,
            systemPrompt: prompts_1.TERMINOLOGY_PROMPT,
            userPrompt: JSON.stringify({
                text,
                limit: typeof maxTerms === "number" ? maxTerms : 15,
            }),
            schemaName: "TerminologyResult",
            schema: prompts_1.TERMINOLOGY_SCHEMA,
        });
        res.json(result);
    }));
}
